wowfeed
========

[![Build Status](https://secure.travis-ci.org/rejas/wowfeed.png?branch=master)](https://travis-ci.org/rejas/wowfeed)

wow rss feed generator

available options:
------------------

- **region**: `us`, `eu`, `tw`, `kr`
- **realm**: url-friendly name of the realm (remove `'` as in `Khaz'goroth`, replace whitespace with `-`)
- **character** / **guild**: name of char / guild (replace whitespace with `+`)
- **maxItems** *(optional, default: 20)*: limit number of retrieved items
- **showSteps** *(optional, default: true)*: show steps necessary for achievements

example:
-------

- **character rss feed**

https://wowfeed.herokuapp.com/?region=eu&realm=khazgoroth&character=grimstone

- **guild rss feed**

https://wowfeed.herokuapp.com/?region=eu&realm=khazgoroth&guild=mokrah+toktok
