# Unison

Unison is a cross-platform alumni and student networking app. It provides role-based experiences for students and alumni, including profile management, professional opportunities, events, announcements, connections, search, notifications, and direct messaging.

The mobile client is built with Expo and React Native, using React Navigation for app navigation and a REST API for data and authentication.

## Features

- Email OTP registration, login, password reset, and persistent authenticated sessions
- Separate student and alumni navigation flows
- Student and alumni profiles, skills, and work-experience management
- User discovery, public profiles, connections, follow/block actions, and connection requests
- Opportunities: browse, post, edit, and manage posts
- Events: browse, create, edit, RSVP, and view attendees
- Announcements, notifications, and an activity feed
- Conversations with text and image messaging

## Tech stack

- Expo SDK 54 and React Native 0.81
- React 19
- React Navigation 7
- Axios for HTTP requests
- AsyncStorage for local session persistence

## Prerequisites

Install the following before running the project:

- Node.js 20 LTS or newer
- npm (included with Node.js)
- One of the following targets:
  - Expo Go on an Android or iOS device
  - Android Studio with an Android emulator
  - Xcode with an iOS Simulator (macOS only)

## Getting started

From the project directory, install dependencies and start Expo:

```bash
cd Unison-App-Frontend
npm install
npm start
```

When the Expo developer tools open, choose a target:

- Scan the QR code with Expo Go to run on a physical device.
- Press `a` to open Android.
- Press `i` to open iOS (macOS only).
- Press `w` to run the web build in a browser.

You can also start a specific platform directly:

```bash
npm run android
npm run ios
npm run web
```

## Quality checks

Run the Expo ESLint configuration with:

```bash
npm run lint
```

## API configuration

The app currently calls the hosted backend configured in [`services/api.js`](services/api.js):

```js
const BASE_URL = 'https://unison-backend-lxmu.onrender.com/api';
```

To use another API (for example, a local backend), replace this value with that server's `/api` URL. The Axios request interceptor automatically attaches the saved bearer token to authenticated requests.

The app expects the backend to support the authentication, profiles, connections, opportunities, search, notifications, chat, events, and feed endpoints used in that service. See [complete_api_handbook.md](complete_api_handbook.md) for the API reference.

> For a physical device, a local API URL must be reachable from the device; `localhost` points to the phone itself, not your development computer.

## Project structure

```text
Unison-App-Frontend/
|- App.js                       # Application entry: auth provider + root navigator
|- app.json                     # Expo application configuration
|- context/
|  `- AuthContext.js            # Session restoration, login, and logout state
|- navigation/
|  |- RootNavigator.js          # Role-based auth/student/alumni stacks
|  |- StudentTabNavigator.js    # Student bottom-tab navigation
|  `- AlumniTabNavigator.js     # Alumni bottom-tab navigation
|- screens/
|  |- Auth/                     # Login, registration, OTP, password reset
|  |- Student/                  # Student home and profile
|  |- Alumni/                   # Alumni home, profile, posts, events, editing
|  |- Shared/                   # Search, network, notifications, details, profiles
|  `- Conversation/             # Inbox and chat detail
|- components/                  # Reusable UI components
|- services/api.js              # Axios client and backend endpoint helpers
|- assets/images/               # App icons and splash assets
`- complete_api_handbook.md     # Backend endpoint documentation
```

## Authentication and roles

`AuthContext` restores `userToken` and `userData` from AsyncStorage at launch. After login, `RootNavigator` displays the appropriate app based on `userData.role`:

- `student` users receive the student tabs: Home, Posts, Network, Search, and Profile.
- Other authenticated roles are routed to the alumni tabs: Home, Search, Network, Opportunities, and Profile.

To test both experiences, register or use accounts whose backend role is `student` and `alumni`.

## Builds

The repository includes EAS build profiles in [`eas.json`](eas.json): `development`, `preview`, and `production`. After installing and authenticating the Expo EAS CLI, builds can be started with, for example:

```bash
npx eas build --platform android --profile preview
```

Use the Expo account that owns the configured EAS project to create production builds.

## Notes for contributors

- Keep API access centralized in `services/api.js` instead of creating Axios clients inside screens.
- Navigation is implemented with React Navigation. The app's active entry point is `App.js`; it does not currently use Expo Router's file-based `app/` routing.
- The `reset-project` script is inherited from the Expo starter and is destructive to the current app structure. Do not run it unless you intentionally want to reset the project.
- Native `android/` and `ios/` directories are generated by Expo and intentionally ignored by Git.

## Useful links

- [Expo documentation](https://docs.expo.dev/)
- [React Navigation documentation](https://reactnavigation.org/)
