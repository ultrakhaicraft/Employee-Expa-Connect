# Employee Expa Connect Introduction and Installation Guide
## Introduction
-Employee Expa Connect is a website application system where the user can discover and share place of interest, host team even, create personal itinerary, and chat and connect with other people. The purpose of the project is to help the user understand and be comfortable when they in a different country for the first time. As well as help them connect with other user from different location.

-As of right now, this project will be hiatus for indefinite time. This git repository will be serve as an archived of what our team manage to accomplished

## Function list
-Suggest and discover place of interest, including interacting with map

-Request friend and chat with other user

-Planning and manage event

-Manage personal itinerary

-Interact with AI Chatbot

## Setting up the project locally
-Before starting, make sure to install Visual Studio, Microsoft SQL Server. Installing Visual Studio Code is optional.
-First, Clone the git source or download the file.
-Then refer to these section below to setup front end, back end, and database:

### Front end
1. Open Command Prompt or Terminal application in "Employee-Expat-Connect" file
2. Enter command "cd BEESRS_Frontend_src" to use the front end source code directory
3. Install the library package for front end package with "npm-install --legacy-peer-deps"
4. Open the .env file in the front end source code and fill in the missing values such as api key and secret
5. When the directory source is BEESRS_Frontend_src, run "npm run dev". This will start the frontend application in local

### Back end
1. Open "BEESRS.sln" in "BEESRS_Backend_src" file. This should open the visual studio
2. Open the appsettings.json file and add in the missing value such as api key and secret
3. Configure the startup project by set the "API" as Single Startup Project
4. Run the project with Ctrl + F5, This will start the backend server in local

### Creating Database with Migration
-Before creating the database, make sure the connection string able to connect to your Microsoft SQL server.
1. Open Package Manager Console by go to "Tools" --> "NuGet Package Manager" --> "Package Manager Console"
2. Set Default Project as "Infrastructure"
3. If there isn't any migrations yet, run "Add-Migration InitialCreate"
4. Once the migration has been created, run "Update-Database" to create the database in your SQL Server

## Credit
-This project is a teamwork effort of four members, these will be included as git username

+vanhungne: Implement AI system, Event Management, Chat system.

+ultrakhaicraft: User Profile Management, Itinerary Management.

+cbq114: Place of Interest Discovery, Reviews Management, Content Moderation.

+bttu2002: UI/UX Design and Implementation
