# TRex Web Playground #


Have TRex running inside a container using your web browser.

Provides a quick way to get a look-and-feel of what TRex is.

![trex logo](https://i.imgur.com/gx0r5PS.png)


## Getting Started ##

TRex web playground is actually a simple skeleton meant to be enhanced.

It consists of a node.js server and client static HTML file.


### Prerequisites ###

To get the server running you need:
* [Node.js](https://nodejs.org)
* [Docker](https://docs.docker.com/install/)

### Installing ###

Assuming you have node.js and Docker, do...

```
$ docker pull trexcisco/trex-dev:2.36
```

And to install the JS dependancies...
```
$ yarn install
```

...or...

```
$ npm install
```


End with an example of getting some data out of the system or using it for a little demo

## Starting TRex Web Server

Simply launch node.js server from root:

```
npm start
```

## Contributing
This project is actually more of a proof of concept of what can be done with TRex
and Docker.

It was created in a few days just to play with the possibilties.

Thus, we encourge contributing to this project by someone who actually knows Javascript and node.js :)

