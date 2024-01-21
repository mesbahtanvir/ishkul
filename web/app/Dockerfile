# Stage 1 - Build the React app
FROM node:14 as build
WORKDIR /ishkul-app
COPY package.json package-lock.json ./
RUN npm install
COPY . ./
RUN npm run build

# Stage 2 - Serve the app with Nginx
FROM nginx:alpine
COPY --from=build /ishkul-app/build /usr/share/nginx/html
COPY custom.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
