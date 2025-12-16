# Ogeemo Field App: Development Plan

_This document outlines the step-by-step plan to create a standalone Progressive Web App (PWA) for workers to track their time, location, and work notes. This app will be separate from the main Ogeemo admin application but will connect to the same Firebase backend._

---

## Phase 1: Backend Foundation & Data Modeling

**Objective:** Establish the data structures in the main Ogeemo project required to support the Field App.

1.  **Update Data Schema (`backend.json`):**
    *   Define a new entity called `TimeLog` to store individual work sessions. This entity should include fields for:
        *   `workerId` (string, required)
        *   `startTime` (string, format: date-time, required)
        *   `endTime` (string, format: date-time, required)
        *   `durationSeconds` (number, required)
        *   `notes` (string, optional)
        *   `status` (string, enum: "active", "paused", "completed")
    *   Define a new entity called `LocationLog` for GPS tracking. This should include:
        *   `timeLogId` (string, required, to link to a specific work session)
        *   `workerId` (string, required)
        *   `timestamp` (string, format: date-time, required)
        *   `latitude` (number, required)
        *   `longitude` (number, required)
        *   `accuracy` (number, optional)

2.  **Update Firestore Structure (`backend.json`):**
    *   Add a new collection path: `/timeLogs/{timeLogId}` that uses the `TimeLog` schema.
    *   Add a new sub-collection path: `/timeLogs/{timeLogId}/locations/{locationId}` that uses the `LocationLog` schema.

3.  **Update Firestore Security Rules (`firestore.rules`):**
    *   Add new rules for the `/timeLogs/{timeLogId}` and its sub-collection.
    *   **Rule Logic:** A worker should only be able to create, read, and update their *own* time logs and location logs. The `workerId` field must match the authenticated user's `uid`. Admins should have read access to all logs for reporting purposes.

## Phase 2: Field App Project Setup

**Objective:** Create the new, isolated Next.js project for the Field App.

1.  **Create New Next.js Project:**
    *   Initialize a new Next.js application in a separate directory (e.g., `field-app`).
    *   Use the same core technology stack: Next.js, React, TypeScript, and Tailwind CSS.

2.  **Connect to Firebase:**
    *   Copy the existing Firebase configuration (`src/lib/firebase.ts` and `.env.local` variables) from the main Ogeemo app into the new Field App project.
    *   Implement the same `AuthProvider` context to handle user login, logout, and session management. This ensures seamless authentication using the same user credentials as the main app.

## Phase 3: Core Field App Features

**Objective:** Build the primary user interface and functionality of the Field App.

1.  **Build the Minimal UI:**
    *   Create a single-page layout that feels like a mobile app (minimal chrome, large touch targets).
    *   The UI should contain:
        *   A "Clock In" / "Clock Out" button.
        *   A timer display.
        *   A "Pause" / "Resume" button.
        *   A textarea for work notes.
        *   A "Log Session" button.
        *   A "Log Location" button.
        *   A list to display logged sessions and locations for the day.

2.  **Implement Time-Tracking Logic:**
    *   **Clock In:** Starts a "work day" session.
    *   **Timer:** Implement the logic for starting, pausing, resuming, and stopping a timer. Store the start time and pause durations to accurately calculate elapsed work time.
    *   **Log Session:** When clicked, this saves the current timer's elapsed duration and any notes as a `TimeLog` document in Firestore. The timer and notes area are then reset, ready for the next session.
    *   **Clock Out:** Logs any final active session and marks the end of the work day.

## Phase 4: Advanced Features & Integration

**Objective:** Implement GPS tracking, offline support, and connect the data back to the admin app.

1.  **GPS Tracking (Field App):**
    *   On "Clock In," request permission from the user to access their location.
    *   While the timer is running (and not paused), use `navigator.geolocation.watchPosition` to periodically capture the device's coordinates.
    *   Write each coordinate and timestamp as a new `LocationLog` document in the sub-collection of the current `TimeLog`.

2.  **Offline Capability (Field App):**
    *   Utilize Firestore's built-in offline persistence. When the app is offline, all writes (time logs, location logs) will be queued locally.
    *   When the network connection is restored, the Firebase SDK will automatically sync the queued data to the server. Implement UI indicators to show the user the current sync status (e.g., "Offline, data saved locally," "Syncing...").

3.  **Admin Reporting (Main Ogeemo App):**
    *   Modify the "Time Log Report" page (`src/app/(app)/reports/time-log/page.tsx`).
    *   This page will now fetch data directly from the `/timeLogs` collection in Firestore.
    *   Add functionality for admins to filter time logs by worker and date range.
    *   **Future Enhancement:** Add a map component to visualize the GPS data for a selected time log.

By following this phased plan, we can methodically build a secure, robust, and user-friendly Field App that seamlessly integrates with the main Ogeemo platform on the backend.