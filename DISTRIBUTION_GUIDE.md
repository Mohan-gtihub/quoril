# Do I need to host the app?

**Short Answer: NO.**

Since Quoril is a **Desktop Application** (Electron), it runs locally on your user's computer, just like Microsoft Word or VS Code. It does not "live" on a server like a website.

### How the `quoril://` Redirect Works (No Hosting Needed)

Because we set up the **Custom Protocol (`quoril://`)**, you do **not** need a hosted website to handle login redirects.

1.  User clicks "Confirm Email" in their inbox.
2.  The link points to `quoril://auth/callback...`.
3.  The User's Operating System (Windows/Mac) sees `quoril://` and knows: *"Aha! This link belongs to the Quoril app!"*
4.  The OS automatically opens your installed app and passes the login token.
5.  Actual authentication happens inside the desktop app.

---

### What *IS* Hosted?

1.  **The Backend (Supabase):** Your database and authentication logic are already hosted by Supabase in the cloud. You don't need to do anything else here.
2.  **The Installer (The `.exe` file):** You need a place for users to **download** the app setup file.

### How to "Distribute" (Share) Your App

You don't "host" the app, you simply provide a download link for the installer. The best free way to do this is **GitHub Releases**.

#### Recommended: GitHub Releases (Free)
Since your code is already on GitHub, this is the easiest path.

1.  **Build the App:**
    ```powershell
    npm run dist:win
    ```
    This creates `Quoril Setup 1.0.0.exe` in the `release/` folder.

2.  **Create a Release:**
    *   Go to your GitHub repository.
    *   Click **Releases** on the right sidebar.
    *   Click **Draft a new release**.
    *   Tag version: `v1.0.0`.
    *   Title: `Quoril v1.0.0`.
    *   **Upload the `.exe` file** from your `release/` folder here.
    *   Click **Publish release**.

3.  **Share the Link:**
    Sends users the link to this GitHub Release page. They download the `.exe`, install it, and everything (including login) works magically!
