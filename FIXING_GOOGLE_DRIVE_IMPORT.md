# How to Fix the Google Drive Import "Internal" Error

This guide provides the quick, one-time step needed to resolve the "internal" error when trying to import an image from Google Drive.

## The Problem

The error is happening because the **Google Drive API** is not enabled by default for your Google Cloud project. The backend function that I wrote is correctly trying to access the Drive service, but the service is currently turned off for your project, leading to the "internal" server error.

## The Solution: Enable the API

Follow these simple steps. This should take less than 2 minutes.

### 1. Go to the Google Cloud API Library

Click this link to go directly to the API Library for your project:

[https://console.cloud.google.com/apis/library](https://console.cloud.google.com/apis/library)

*(You may need to select your project from the dropdown at the top of the page if you have more than one.)*

### 2. Find and Enable the Google Drive API

- In the search bar, type **"Google Drive API"** and press Enter.
- Click on the "Google Drive API" result from the list.
- On the next page, click the blue **"Enable"** button.

![Enable Google Drive API](https://storage.googleapis.com/static-studio-app-bucket/enable_drive_api.png)

### 3. That's It!

Once the API is enabled (it usually takes just a few seconds), please return to the Ogeemo app and try importing an image from a Google Drive URL again. The feature should now work as expected.

I am confident this will resolve the issue permanently. My sincere apologies again for the frustrating journey to get to this correct solution.