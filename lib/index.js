var _ = require('underscore');
var debug = require('debug')('odbc-session-store');
var odbc = require('odbc');
var util = require('util');

module.exports = function(session) {
  var Store = session.Store;

  var _extractFirstValue = function(recordset) {
    var value = recordset;
    while(value && _.isArray(value)) {
      value = value[0];
    }
    if (value && _.isObject(value)) {
      for(var key in value) {
        value = value[key];
        return value;    
      }
    }
  };

  function OdbcStore(options) {
    var self = this;

    options = options || {};
    Store.call(self, options);

    if (_.isUndefined(options.db)) {
      throw new Error('A db must be provided.');
    }
    if (!_.isUndefined(options.ttl) && !_.isNumber(options.ttl)) {
      throw new Error('If defined, options.ttl must be an instance of Number.');
    }
    else if (options.ttl <= 0) {
      throw new Error('If defined, options.ttl must be > 0.'); 
    }
    if (!_.isUndefined(options.reapInterval) && !_.isNumber(options.reapInterval)) {
      throw new Error('If defined, options.reapInterval must be an instance of Number.');
    }
    else if (options.reapInterval === 0 || options.reapInterval < -1) {
      throw new Error('If defined, options.reapInterval must a positive number or -1 to indicate no reaping.'); 
    }
    if (!_.isUndefined(options.reapCallback) && !_.isFunction(options.reapCallback)) {
      throw new Error('If defined, options.reapCallback must be a function.');
    }

    self.options = {
      db: options.db,
      ttl: options.ttl || 3600,
      reapInterval: options.reapInterval || 3600,
      reapCallback: options.reapCallback || _.noop
    };

    if (self.options.reapInterval !== -1) {
      self.reap();
      setInterval(self.reap.bind(self), self.options.reapInterval * 1000);
    }
  };

  util.inherits(OdbcStore, Store);

  OdbcStore.prototype.reap = function () {
    debug('reap');
    var self = this;
    var stmt = 'delete [Session] where lastTouchedUtc <= dateadd(second, -1 * ?, getutcdate());';
    self.options.db.query(stmt, [self.options.ttl], self.options.reapCallback);
  };

  OdbcStore.prototype.get = function (sessionId, callback) {
    debug('get', sessionId);
    var self = this;
    var stmt = 'select sessionData from [Session] where sessionId = ?;';
    self.options.db.query(stmt, [sessionId], function(err, recordset) {
      if (err) return callback(err);
      var data = _extractFirstValue(recordset);
      if (data) {
        var session = null;
        try 
        {
          session = JSON.parse(data);
        }
        catch(err)
        {
          return callback(err);
        }
        self.touch(sessionId, session, function(err) {
          callback(err, session);
        });
      }
      else {
        callback();
      }
    });
  }

  OdbcStore.prototype.set = function (sessionId, session, callback) {
    debug('set', sessionId, session);
    var self = this;
    var stmt = 'if exists(select sessionId from [Session] where sessionId = ?)\
                  begin\
                    update [Session] set sessionData = ? where sessionId = ?;\
                  end\
                  else\
                  begin\
                    insert into [Session] (sessionId, sessionData, lastTouchedUtc) values(?, ?, getutcdate());\
                  end';
    var sessionData = JSON.stringify(session);
    var params = [sessionId, sessionData, sessionId, sessionId, sessionData];
    self.options.db.query(stmt, params, callback);
  };

  OdbcStore.prototype.destroy = function (sessionId, callback) {
    debug('destroy', sessionId);
    var stmt = 'delete [Session] where sessionId = ?';
    this.options.db.query(stmt, [sessionId], callback);
  };

  OdbcStore.prototype.touch = function (sessionId, session, callback) {
    debug('touch', sessionId);
    var stmt = 'update [Session] set lastTouchedUtc = getutcdate() where sessionId = ?';
    this.options.db.query(stmt, [sessionId], callback);
    return this;
  };

  OdbcStore.prototype.length = function (callback) {
    debug('length');
    var stmt = 'select count(*) from [Session]';
    this.options.db.query(stmt, function (err, recordset) {
      if (err) return callback(err);
      var length = _extractFirstValue(recordset) || 0;
      callback(null, length);
    });
  };

  OdbcStore.prototype.clear = function (callback) {
    debug('clear');
    var stmt = 'delete [Session]';
    this.options.db.query(stmt, callback);
  };

  return OdbcStore;
};