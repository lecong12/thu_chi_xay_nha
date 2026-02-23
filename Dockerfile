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

# Copy config vào thư mục templates để Nginx tự động xử lý thay thế biến môi trường
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

# Cấu hình để Nginx chỉ thay thế biến $PORT (giữ nguyên $uri và các biến khác)
ENV NGINX_ENVSUBST_FILTER=PORT
ENV PORT=80

CMD ["nginx", "-g", "daemon off;"]