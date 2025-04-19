## Running the Application

This project uses Docker Compose to manage the application services for both development and production environments. Ensure you have Docker and Docker Compose installed.

### Prerequisites

1.  **Create a `.env` file:** Copy the `.env.example` file (if you have one) or create a new `.env` file in the project root directory.
    ```bash
    cp .env.example .env
    ```
    Fill in the required environment variables (API keys, etc.) in the `.env` file. Different values might be needed for development and production. Docker Compose will automatically load variables from this file.

### Development Mode

This mode uses `docker-compose.dev.yml` which enables live-reloading for code changes.

1.  **Build and run the services:**
    ```bash
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
    ```
    *   The `--build` flag is necessary the first time you run the command or after making changes to Dockerfiles or application dependencies (`package.json`).
    *   For subsequent starts without changes, you can omit `--build`:
        ```bash
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
        ```

2.  **Access the application:**
    *   Frontend: [http://localhost:3000](http://localhost:3000)
    *   API: [http://localhost:4000](http://localhost:4000)

3.  **Stop the services:** Press `Ctrl+C` in the terminal where compose is running, or run:
    ```bash
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
    ```

### Production Mode

This mode uses `docker-compose.prod.yml` to build and run optimized production images. It does **not** mount local source code.

1.  **Build the production images:** Make sure your `.env` file contains the **production** values for build arguments (like `NEXT_PUBLIC_...`) and runtime environment variables.
    ```bash
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
    ```

2.  **Run the services in detached mode:**
    ```bash
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    ```
    *   The `-d` flag runs the containers in the background.

3.  **Access the application:**
    *   Frontend: [http://localhost:3000](http://localhost:3000)
    *   API: [http://localhost:4000](http://localhost:4000)
    *(Note: In a real production deployment, you might have a reverse proxy like Nginx in front of these services).*

4.  **Check logs (optional):**
    ```bash
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
    ```

5.  **Stop the services:**
    ```bash
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
    ```

## Access

*   Frontend: [http://localhost:3000](http://localhost:3000)
*   API: [http://localhost:4000](http://localhost:4000)