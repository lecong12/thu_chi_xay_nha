# Stage 1: Build the React application
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

# Nhận biến môi trường (Build Args) cho React
# Railway/Render cần cấu hình biến này trong phần Build Settings hoặc Environment Variables
ARG REACT_APP_SHEET_ID
ENV REACT_APP_SHEET_ID=$REACT_APP_SHEET_ID

# Thêm biến Access Key để React nhận được lúc build
ARG REACT_APP_APPSHEET_ACCESS_KEY
ENV REACT_APP_APPSHEET_ACCESS_KEY=$REACT_APP_APPSHEET_ACCESS_KEY

# Thêm biến App ID riêng cho AppSheet (Khác với Google Sheet ID)
ARG REACT_APP_APPSHEET_APP_ID
ENV REACT_APP_APPSHEET_APP_ID=$REACT_APP_APPSHEET_APP_ID

# Kiểm tra xem biến đã vào được chưa ngay lúc build
RUN if [ -z "$REACT_APP_APPSHEET_ACCESS_KEY" ]; then echo "WARNING: Access Key dang bi TRONG!"; else echo "SUCCESS: Da nhan duoc Access Key."; fi

COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80