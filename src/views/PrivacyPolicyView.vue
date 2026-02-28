<script setup lang="ts">
import BackButton from '@/components/navigation/BackButton.vue'
</script>

<template>
  <section class="legal-scroll w-full h-full overflow-y-auto pb-20 md:pb-6">
    <div class="w-full px-4 lg:px-0 pt-4 md:pt-6">
      <div class="flex items-center gap-2">
        <BackButton />
        <h1 class="legal-title text-3xl sm:text-4xl text-mainText">
          Политика конфиденциальности
        </h1>
      </div>

      <article class="mt-6 legal-copy text-gray-200">
        <section class="legal-section">
          <h2 class="legal-heading text-mainText">1. Общие положения</h2>
          <p class="legal-paragraph">
            1.1. Настоящая Политика конфиденциальности (далее — «Политика») регулирует порядок
            обработки и защиты информации, которую Пользователь передаёт при использовании сервиса
            (далее — «Сервис»).
          </p>
          <p class="legal-paragraph">
            1.2. Используя Сервис, Пользователь подтверждает своё согласие с условиями Политики.
            Если Пользователь не согласен с условиями — он обязан прекратить использование
            Сервиса.
          </p>
        </section>

        <section class="legal-section">
          <h2 class="legal-heading text-mainText">2. Сбор информации</h2>
          <p class="legal-paragraph">2.1. Сервис может собирать следующие типы данных:</p>
          <ul class="legal-list">
            <li>идентификаторы аккаунта (логин, ID, никнейм и т.п.);</li>
            <li>
              техническую информацию (IP-адрес, данные о браузере, устройстве и операционной
              системе);
            </li>
            <li>историю взаимодействий с Сервисом;</li>
          </ul>
          <p class="legal-paragraph">
            2.2. Сервис не требует от Пользователя предоставления паспортных данных, документов,
            фотографий или другой личной информации, кроме минимально необходимой для работы.
          </p>
        </section>

        <section class="legal-section">
          <h2 class="legal-heading text-mainText">3. Использование информации</h2>
          <p class="legal-paragraph">
            3.1. Сервис может использовать полученную информацию исключительно для:
          </p>
          <ul class="legal-list">
            <li>обеспечения работы функционала;</li>
            <li>связи с Пользователем (в том числе для уведомлений и поддержки);</li>
            <li>анализа и улучшения работы Сервиса.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2 class="legal-heading text-mainText">4. Передача информации третьим лицам</h2>
          <p class="legal-paragraph">
            4.1. Администрация не передаёт полученные данные третьим лицам, за исключением случаев:
          </p>
          <ul class="legal-list">
            <li>если это требуется по закону;</li>
            <li>
              если это необходимо для исполнения обязательств перед Пользователем (например, при
              работе с платёжными системами);
            </li>
            <li>если Пользователь сам дал на это согласие.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2 class="legal-heading text-mainText">5. Хранение и защита данных</h2>
          <p class="legal-paragraph">
            5.1. Данные хранятся в течение срока, необходимого для достижения целей обработки.
          </p>
          <p class="legal-paragraph">
            5.2. Администрация принимает разумные меры для защиты данных, но не гарантирует
            абсолютную безопасность информации при передаче через интернет.
          </p>
        </section>

        <section class="legal-section">
          <h2 class="legal-heading text-mainText">6. Отказ от ответственности</h2>
          <p class="legal-paragraph">
            6.1. Пользователь понимает и соглашается, что передача информации через интернет всегда
            сопряжена с рисками.
          </p>
          <p class="legal-paragraph">
            6.2. Администрация не несёт ответственности за утрату, кражу или раскрытие данных, если
            это произошло по вине третьих лиц или самого Пользователя.
          </p>
        </section>

        <section class="legal-section">
          <h2 class="legal-heading text-mainText">7. Изменения в Политике</h2>
          <p class="legal-paragraph">
            7.1. Администрация вправе изменять условия Политики без предварительного уведомления.
          </p>
          <p class="legal-paragraph">
            7.2. Продолжение использования Сервиса после внесения изменений означает согласие
            Пользователя с новой редакцией Политики.
          </p>
        </section>
      </article>
    </div>
  </section>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Manrope:wght@400;500;600&display=swap');

.legal-scroll {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.legal-scroll::-webkit-scrollbar {
  display: none;
}

.legal-title {
  font-family: 'Sora', 'Segoe UI', Arial, sans-serif;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.15;
}

.legal-copy {
  font-family: 'Manrope', 'Segoe UI', Arial, sans-serif;
}

.legal-section {
  margin-top: 1.6rem;
  padding-top: 1.6rem;
}

.legal-section + .legal-section {
  border-top: 1px solid var(--overlay-white-12);
}

.legal-heading {
  font-family: 'Sora', 'Segoe UI', Arial, sans-serif;
  font-size: 1.18rem;
  font-weight: 600;
  line-height: 1.35;
  margin-bottom: 0.75rem;
}

.legal-paragraph {
  max-width: 102ch;
  font-size: 1rem;
  line-height: 1.68;
  font-weight: 400;
}

.legal-paragraph + .legal-paragraph {
  margin-top: 0.7rem;
}

.legal-list {
  margin-top: 0.6rem;
  margin-left: 1.1rem;
  list-style: disc;
  display: grid;
  gap: 0.38rem;
  color: var(--text-primary);
}

@media (min-width: 1024px) {
  .legal-section {
    margin-top: 2rem;
    padding-top: 2rem;
  }

  .legal-section + .legal-section {
    border-top: none;
  }
}

@media (max-width: 640px) {
  .legal-heading {
    font-size: 1.08rem;
  }

  .legal-paragraph {
    line-height: 1.62;
  }
}
</style>
