# Meetup with Avatars

This example is a minimal working setup of a multi-user 3D application with VR support
using [Wonderland Cloud](https://cloud.wonderland.dev).

## Features

* Shows dialog to select username and avatar
* Propagate username and avatar of joined users
* Synchronises position and rotation of users
* Player speaking indicator above the players
* Notifications when users join and leave

## Setup

Instructions on how to run this example.

### Prerequisites

- Download and install [WonderlandEngine](https://wonderlandengine.com/downloads).
- Download and install [NodeJS](https://nodejs.org/en) **Version 20**.
- Create a Wonderland Cloud access token [in the account page](https://wonderlandengine.com/account).
- Save the token file as `wle-apitoken.json` in the example's root.
- Create a server on [Wonderland Cloud](https://cloud.wonderland.dev/):
    - Click "Create Server"
    - Server Name: `my-space`
    - Check "Development Server"
    - Click "Create Server"
- Click the created server, you will find all the configuration for the steps below here.

### Instructions

Follow the following instructions to run the example:

1. Run `yarn` in the `server` directory.
2. Change the `--serverUrl` value of the `start:dev` script in `server/package.json` to match the "CLI URL" of your new server.
3. Run `yarn start:dev` in the `server` directory.
4. Open the `MeetupWithAvatars.wlp` project.
5. Find the `simple-example-client` component on the Player object.
6. Update the `serverPath` value to match the "ServerPath" of your new server.
7. Press the green arrow icon at the top. You can open multiple tabs to test the multi-user.
