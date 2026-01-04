# Stage 1: Build the React application
FROM node:20-alpine as builder

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json .
RUN npm install

# Copy source code and build the application
COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:stable-alpine as production

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built application files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 (as defined in docker-compose.yml mapping 8080:80)
EXPOSE 80

# Nginx runs as the default command
CMD ["nginx", "-g", "daemon off;"]