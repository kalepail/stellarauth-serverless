CREATE TABLE txns(
  _master VARCHAR (56) NOT NULL,
  _app VARCHAR (56) NOT NULL,
  _user VARCHAR (56) NOT NULL,
  _key VARCHAR (56) NOT NULL,
  _txn VARCHAR (64) PRIMARY KEY UNIQUE NOT NULL,
  requestedat BIGINT DEFAULT (extract(epoch from now()) * 1000) NOT NULL,
  reviewedat BIGINT DEFAULT NULL,
  status VARCHAR (10) NOT NULL,
  xdr VARCHAR UNIQUE NOT NULL
);