# use the official Bun image
FROM oven/bun:alpine as base
WORKDIR /usr/src/app

# install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# copy source code
COPY . .

# expose port and run
EXPOSE 3000/tcp
CMD ["bun", "run", "src/index.ts"]
