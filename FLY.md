# JT's Way

# 1. Overview of the Deployment Process

Deploying the **Dejaknify** app to Fly involved the following steps:

- Making a 'fly' branch on the Github Project
- Making sure the app works locally
- Creating an account for : Fly
- Connecting the Github branch to the Fly website
- Have the automatic container making from the Fly created branch merged into the fly branch
- Change the parameters of fly.toml and the Docker file to correctly connect to the 
- Adding the environment variables
- Having to pay for the service as the free trial ended quickly
- Changing the redirect in Auth.js 
- Adding the redirect URL to the Google account configuration to ensure that **Sign in with Google** works correctly

# 2. Pros and cons of the cloud service based on your experience with it.

## Pros

- Automatic Containerization
- Log lines from both running and setup from the web control panel saved for each deployment
- Automatic CI/CD pipeline integration with GitHub

## Cons

- I had to pay money for it as the trial ran out
- The logs have to be copy pasted one at a time for searching
- No quick reference for what the automatic Docker image makes and why

I think that overall it was a good experience, other than the spending money part. Having it work on a branch of the project was also really great specifically for this group project.

# 3. Any challenges or surprises that you encountered

As I was able to utilize what Fly automatically has with containerization, the main problem was scrutinizing the Docker file it made to be sure that it correctly connected our version of the database. Another early suprise was that the automatic generation gave it a generic name for the project, so it didn't correctly connect up with the Fly web service and I had to change it to dejankify-njc to deploy secrets.
Secrets also have to be deployed separately from the first deployment, which is a weird way to do it. It's this way as there has to be machines with the containers up and running.
For some reason, the free trial ended earlier than it said, and the only error it gave me was the need for having a card with Fly, so that suprised me.
