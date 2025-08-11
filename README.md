## Running the Application Locally

This project uses Docker Compose to manage the application services for local development. Ensure you have Docker and Docker Compose installed.

### Contract Address

```
USDC: 0x7F594ABa4E1B6e137606a8fBAb5387B90C8DEEa9
JPYT: 0x40445BC6d7C6Cc4a89cD15a7BFde018dd3119a1A
ERC4626 Token Vault: 0x79C8CF2480d4A7Bf413a7f50c64FE9AD7B6c1102
DAI: 0x517B618ab8BE4a100e3C0bf770277b522Bf7d5c4
WrappedSepolia: 0x02B30b775a710eAFa4D7e873120610E15805C127
ERC20 Token Factory: 0x8525c1B13b72eE9d329c8A8aC262ac6725143455
Verifying Paymaster: 0xB0CE36520f1B8D74AaC9d91eEfAb3f83dBD36c1F
ERC4337 Factory: 0x25ac8Ca60bcdCBA6D9DA8D40Ac07Ea7047971004
```

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

### Package install

```bash
docker-compose exec frontend/backend npm install <package name>
```

### Database Operations (with Docker + Prisma)

Common commands for managing the database inside Docker containers:

| Task                      | Command                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| Create & apply migration  | `docker-compose exec backend npx prisma migrate dev --name <name>` |
| Apply existing migrations | `docker-compose exec backend wwv`                                  |
| Generate Prisma client    | `docker-compose exec backend npx prisma generate`                  |
| Open Prisma Studio (GUI)  | `docker-compose exec backend npx prisma studio`                    |
| Reset database (dev only) | `docker-compose exec backend npx prisma migrate reset`             |
| Enter DB container (psql) | `docker-compose exec db sh`                                        |

> Replace `<name>` with your migration name (e.g., `add_user_table`).

_Use these commands to manage database schema and inspect data during development._

### Accessing the Services

Once the containers are running:

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **API:** [http://localhost:4000](http://localhost:4000)
