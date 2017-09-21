# dweet

## Changes from dweet.io

In slight contrast to the dweet.io client, the format of the urls are:

```
POST /dweet/for/:user/:thing
```

Where :user and :thing are the distinct elements.  This will allow
queries against things belonging to a particular user rather than
a completely flat thing GUID that dweet.io uses.

To match this format, the get is similar

```
GET /dweet/for/:user/:thing
```

Returns the last dweet thing posted by that user

## Temporary dweets

All dweets are insertted into a mongo database.  For dweets that
do not have to be persistant, post to:

```
POST /dweet/temp/:user/:thing
```

The standard `GET /dweet/for/:user/:thing` will retrieve this dweet.
A post to either /dweet/temp or /dweet/for will set the :user/:thing
dweet, the only difference is the temp version will not write it to
the database.


