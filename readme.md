# odbc-session-store

Implementation of an express-session store using ODBC. Uses [node-odbc](https://github.com/wankdanker/node-odbc) to connect to the database.

Is a fork of [mssql-session-store](https://github.com/jwathen/mssql-session-store)

## Installation

```
$ npm install odbc-session-store
```

## Important:
The store is expecting this table to exist in your database.
```
create table Session
(
  sessionId nvarchar(450) not null primary key,
  sessionData nvarchar(max) null,
  lastTouchedUtc datetime not null  
)
```

## Example
```
var session = require('express-session')
var OdbcStore = require('odbc-session-store')(session);

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  store: new OdbcStore(options) // see options below
}));
```

## Options
```
var options = {
	connection: existingConnection,
	ttl: 3600,
	reapInterval: 3600,
	reapCallback: function() { console.log('expired sessions were removed); }
};
```
### connection
Default value: `undefined`

Mandatory instance of a Connection from [node-odbc](https://github.com/wankdanker/node-odbc).

### ttl
Default value: `3600`

Optional time to live in seconds.  Sessions that have not been "touched" in this amount of time will be destroyed.  If reapInterval is set to -1 then this setting has no effect.

### reapInterval
Default value: `3600`

Optional interval to destroy expired sessions in seconds or -1 to never remove expired sessions.  Fires once on construction of the `MssqlStore` object (unless reapInterval is set to -1).

### reapCallback
Default value: `undefined`

Optional callback that is fired after each reaping.

## License
[http://jwathen.mit-license.org](http://jwathen.mit-license.org/)
