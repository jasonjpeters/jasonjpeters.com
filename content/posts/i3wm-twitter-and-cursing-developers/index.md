---
title: i3wm, Twitter, and Cursing Developers
date: 2021-02-08
description: Displaying @gitlost in i3wm - git commit -m '#!@*'
tags:
  - github
  - twitter
  - i3wm
  - shell
image: ./featured.webp
---

They can be found in messages, images, film, and other, usually electronic mediums. Easter eggs coined by Steve Wright Director of Software Development at Atari Consumer Division during the the Atari 2600 Era when programmer Warren Robinett hid his initials in the seminal 1970 video game Adventure.

Today the phenomenon can be found in pop culture including TV Shows like Fringe where small details (i.e. paint color splash) lead into the main plot point of the following episode, A Han Solo carbon figurine hidden by the cast in a scene of each episode of Jos Whedon's Firefly, or the plethora of details being discovered by fans within the MCU (Marvel Universe).

Myself, and my colleagues have been known to also hide details of some joke or situation we are making fun of in our naming conventions for variables and files, print messages to the browsers console when the Konami code is entered, or in our commit messages.

That brings us to the purpose of this article. Sometime ago my wife was listening to the Nerdcast from Brasil and brought my attention to a bot they mentioned that parses publicly available commit messages containing curses from GitHub and posts them anonymously to the Twitter account @gitlost.

[Read original article on dev.to](https://dev.to/jase/i3wm-twitter-and-cursing-developers-1ip8)

```bash terminal copy title="@gitlost"
#!/bin/sh

gitlost() {
    GITLOST=$(twurl "/1.1/statuses/user_timeline.json? 
    screen_name=gitlost&include_rts=false&count=1");)
    GITLOST=$(echo "$GITLOST" | jq '.[] | .text' | sed 
    's/"//g')
}

i3status -c $HOME/.i3/i3status.conf | while :
do
    gitlost
    read line
    echo "$GITLOST | $line" || exit 1
    sleep 3600
done

```
