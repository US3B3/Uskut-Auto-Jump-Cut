# ✂️ Uskut - Otomatik Sessizlik Giderici

**Uskut**, video dosyalarınızdaki sessiz bölümleri tarayıcı üzerinde analiz eden, bu bölümleri çıkartan ve **Adobe Premiere Pro**'ya aktarabileceğiniz bir XML dosyası üreten açık kaynaklı bir araçtır.

Tüm işlem **istemci tarafında (tarayıcınızda)** gerçekleşir. Videolarınız herhangi bir sunucuya yüklenmez, bu sayede maksimum gizlilik ve hız sağlanır.

![Uskut Ekran Görüntüsü](https://via.placeholder.com/800x450?text=Uskut+Arayuz+Onizleme)

## 🌟 Özellikler

*   **Tarayıcı Tabanlı Analiz:** Web Audio API kullanılarak videolar saniyeler içinde analiz edilir.
*   **Gizlilik Odaklı:** Dosyalarınız bilgisayarınızdan dışarı çıkmaz.
*   **Hassas Ayarlar:**
    *   **Sessizlik Eşiği (dB):** Hangi ses seviyesinin altının sessizlik sayılacağını belirleyin.
    *   **Minimum Süre:** Ne kadar süren sessizliklerin kesileceğini seçin.
    *   **Güvenlik Payı (Padding):** Kesimlerin çok sert olmaması için konuşmaların başına ve sonuna pay bırakın.
*   **Premiere Pro Uyumu:** Final Cut Pro XML formatında çıktı vererek Premiere Pro ile sorunsuz çalışır.
*   **Modern Arayüz:** React, Tailwind CSS ve Lucide ikonları ile hazırlanmış şık tasarım.

## 🚀 Kurulum ve Çalıştırma

Bu projeyi kendi bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyin.

### Gereksinimler

*   [Node.js](https://nodejs.org/) (Sürüm 16 veya üzeri önerilir)

### Adım Adım Kurulum

1.  **Repoyu klonlayın:**
    ```bash
    git clone https://github.com/kullaniciadi/uskut.git
    cd uskut
    ```

2.  **Bağımlılıkları yükleyin:**
    ```bash
    npm install
    ```

3.  **Geliştirme sunucusunu başlatın:**
    ```bash
    npm run dev
    ```

4.  Tarayıcınızda `http://localhost:5173` (veya terminalde belirtilen adres) adresine gidin.

## 📖 Kullanım Talimatları

1.  **Video Yükleme:** İşlemek istediğiniz video dosyasını sürükleyip bırakın veya tıklayarak seçin.
2.  **Ayarlar:**
    *   Gürültülü bir ortamda çekim yaptıysanız **Sessizlik Eşiği**ni artırın (örn. -20dB).
    *   Konuşmaların kesilmemesi için **Padding** (Pay) değerini 0.1s - 0.2s civarında tutun.
3.  **Analiz:** "Analiz Et" butonuna basın. İşlem süresi dosya boyutuna ve bilgisayarınızın hızına göre değişebilir.
4.  **İndirme:** İşlem bittiğinde XML dosyasını indirin.

### ⚠️ Premiere Pro'ya Aktarım (Önemli)

Tarayıcı güvenlik kısıtlamaları nedeniyle, web uygulamaları bilgisayarınızdaki dosyanın tam yolunu (path) bilemez. Bu yüzden XML dosyasını Premiere Pro'ya attığınızda medya "Offline" görünecektir.

Bunu düzeltmek için:
1.  İndirdiğiniz XML dosyasını Premiere Pro'ya sürükleyin (Import).
2.  Açılan pencerede dosyalar "Offline" görünecektir.
3.  Dosyayı seçip **"Locate"** (Bul) butonuna basın.
4.  Orijinal video dosyasını seçip **"OK"** deyin.
5.  Premiere Pro kurguyu timeline'a otomatik yerleştirecektir.

## 🛠 Teknolojiler

*   [React](https://reactjs.org/) - UI Kütüphanesi
*   [Vite](https://vitejs.dev/) - Build Aracı
*   [Tailwind CSS](https://tailwindcss.com/) - Stil
*   [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - Ses İşleme

## 📄 Lisans

Bu proje MIT lisansı ile lisanslanmıştır. Dilediğiniz gibi kullanabilir, değiştirebilir ve dağıtabilirsiniz.
