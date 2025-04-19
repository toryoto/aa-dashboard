## Running the Application Locally

This project uses Docker Compose to manage the application services for local development. Ensure you have Docker and Docker Compose installed.

### Prerequisites

1.  **Create a `.env` file:** Copy the `.env.example` file (if available) or create a new `.env` file in the project root directory.
    ```bash
    cp .env.example .env
    ```
    Fill in the required environment variables (API keys, etc.) in the `.env` file for your **local development** setup. Docker Compose (specifically `docker-compose.override.yml`) will use these variables.

### Starting the Services

1.  **Build and run the services:**
    ```bash
    docker-compose up --build
    ```
    - Use the `--build` flag the first time you run the command or after making changes to `Dockerfile`s or application dependencies (`package.json`).
    - For subsequent starts without changes, you can omit `--build`:
      ```bash
      docker-compose up
      ```

### Accessing the Services

Once the containers are running:

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **API:** [http://localhost:4000](http://localhost:4000)
