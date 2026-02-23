# Stage 1: Build the React application
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

# Nhận biến môi trường (Build Args) cho React
# Railway/Render cần cấu hình biến này trong phần Build Settings hoặc Environment Variables
ARG REACT_APP_SHEET_ID
ENV REACT_APP_SHEET_ID=$REACT_APP_SHEET_ID

COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

EXPOSE 80

# Dùng envsubst để thay thế biến $PORT trong file template thành file config thực tế
# Lưu ý: '$PORT' (trong dấu nháy đơn) để bảo vệ các biến khác của Nginx như $uri không bị thay thế
CMD ["/bin/sh", "-c", "envsubst '$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]