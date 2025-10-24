+++
title = 'Concision'
date = '2025-10-19T22:38:51-04:00'
weight = 50
draft = false
+++


## Review and update networks

As your inventory of interfaces evolves, you need to make changes to the endpoints targeted by your profile scans. Control which endpoints your scans target with networks. A network is a configuration object that contains a list of IP addresses. Profiles use networks to determine which endpoints to include or exclude in their scans.

### Add a network

You can add a network when you configure a profile, or you can add a network on the Networks page:
1. Go to the Discover menu > Network and click Add Network.
2. Give the network a name, IP address format, and XXXXXXXXXXX.
3. Click Save. 


### Edit a network

Edit a network to update its IP addresses:
1. To edit a network, go to the Discover menu and click Network.
2. Locate the network you want to edit in the network list and click the edit icon.
3. Make your changes.
4. Click Preview Changes. If your changes do not affect a profile's state, click save.  
   If your changes make an associated profile not valid, you receive a warning message with the following options:
   - "Attach the affected scan profiles to a new network that is a copy of the initial network definition."": Creates a copy of the initial network named "network-name - Copy" and applies that copy to the profiles, maintaining the valid state of all associated profiles. The updated network is no longer associated with any profiles.
   - "Save edits and change affected profiles to invalid.": Saves your changes and makes any associated profiles not valid. Profiles that are not valid do not perform scans, so you must address their state at later time.

### Delete a network

Delete a network if it is no longer useful:
1. To edit a network, go to the Discover menu and click Network.
2. Locate the network you want to delete in the network list and click the delete icon.
3. If the delete action does not make a profile not valid, confirm the changes to delete the network.
   If the delete action makes a profile not valid, you receive a warning message with the following options:
   - "Keep network and only remove it from profiles it does not invalidate.": Does not delete the network but removes it from profiles that are valid without the network.
   - "Delete anyway (this will put the [X] profile into an invalid state).": Deletes the network and makes its associated profiles not valid. [X] is the number of profiles made not valid by the delete action.