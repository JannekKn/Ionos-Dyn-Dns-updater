# Ionos Dyn-Dns updater
Nodejs script to update your dyndns for ionos if ip changes. Has simple Web-UI

## Install 
install this project and the dependencys with ``` npm install ```

## Settings
In the config.json you can change a few variables  
- ip_check_delay_ms: is the delay where the script checks your current ip adress (default is 5sec). If the pp changes at some point it will update your DNS  
- filename: is just the filename where your Domains are saved. If you downloaded the whole repo, there is already a domains.txt and you can leave it on default
- API_Key: This one you have to cange yourself. You can create one on the [Ionos Developer Page](https://developer.hosting.ionos.de/keys). Just give it any Name and save the prefix and encryption somewhere and create the key. Your API-Key is both the values combines with a period ( . ), so it should be prefix.encryption

## General Info/Bugs
I dont know what happens if your list is compleatly empty. I would reccomend at least having one entry in your domains list

## Support
If you have a quistion i should be reachable over Discord. My Server invite: [https://discord.gg/dR7QmEzpah](https://discord.gg/dR7QmEzpah)

