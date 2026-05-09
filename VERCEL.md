# Nima's Way

# 1. Overview of the Deployment Process

Deploying the **Dejaknify** app to Vercel involved the following steps:

- Making sure the app works locally
- Creating a GitHub repository for the app
- Creating an account on : Vercel
- Creating a new project in Vercel
- Importing the GitHub repository
- Adding the environment variables
  > You can directly upload the `.env` file in Vercel.
- Adding the redirect URL to the Google account configuration to ensure that **Sign in with Google** works correctly

# 2. Pros and cons of the cloud service based on your experience with it.

Using Vercel for deploying our app was fairly easy, which is the biggest win in terms of the pros of this approach.

It was very quick — we just had to make sure everything worked before importing the GitHub repository into Vercel.

Every push to GitHub would automatically trigger a **CI/CD pipeline**, which is another major advantage.

## Pros

- Fairly easy deployment process
- Very quick setup
- Automatic CI/CD pipeline integration with GitHub

## Cons

- It can get expensive
- It is most optimized for Next js apps

# 3. Any challenges or surprises that you encountered

There were not many challenges during the deployment process.

The main thing I had to make sure of was that, for the authorized redirect URLs, I had to add:

```txt
/api/auth/callback/google
```

at the end of the URL.
Other than that, there were no major technical challenges.
The only thing that surprised me was how quick and easy the entire deployment process was.
