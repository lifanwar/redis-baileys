# Menggunakan Node.js versi 22 sebagai base image
FROM node:22

# Set working directory di dalam container menjadi 'app'
WORKDIR /app

# Menyalin package.json dan package-lock.json (jika ada)
COPY package*.json ./

# Instalasi dependensi
RUN npm install

# Menyalin seluruh file aplikasi ke dalam container
COPY . .

# Mengekspos port 3040 untuk akses ke server Express
EXPOSE 3099

# Menjalankan aplikasi
# CMD ["node", "bot.js"]
