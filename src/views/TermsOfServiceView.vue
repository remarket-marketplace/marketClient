<script setup lang="ts">
import BackButton from '@/components/navigation/BackButton.vue'
</script>

<template>
  <section class="legal-scroll w-full h-full overflow-y-auto pb-20 md:pb-6">
    <div class="w-full px-4 lg:px-0 pt-4 md:pt-6">
      <div class="flex items-center gap-2">
        <BackButton />
        <h1 class="legal-title text-3xl sm:text-4xl text-mainText">
          Пользовательское соглашение
        </h1>
      </div>

      <article class="mt-6 legal-copy text-gray-200">
        <section class="legal-section">
          <h2 class="legal-heading text-mainText">1. Общие положения</h2>
          <p class="legal-paragraph">
            1.1. Настоящее Пользовательское соглашение (далее — <strong>«Соглашение»</strong>)
            регулирует порядок использования онлайн-сервиса (далее — <strong>«Сервис»</strong>),
            предоставляемого Администрацией.
          </p>
          <p class="legal-paragraph">
            1.2. Используя Сервис, включая запуск бота, регистрацию, оплату услуг или получение
            доступа к материалам, Пользователь подтверждает, что полностью ознакомился с
            условиями настоящего Соглашения и принимает их в полном объёме.
          </p>
          <p class="legal-paragraph">
            1.3. В случае несогласия с условиями Соглашения Пользователь обязан прекратить
            использование Сервиса.
          </p>
        </section>

        <section class="legal-section">
          <h2 class="legal-heading text-mainText">2. Характер услуг и цифровых товаров</h2>
          <p class="legal-paragraph">
            2.1. Сервис предоставляет цифровые товары и услуги нематериального характера, включая,
            но не ограничиваясь: информационные материалы, обучающие программы, консультации,
            цифровые продукты и сервисные услуги.
          </p>
          <p class="legal-paragraph">
            2.2. Материалы, предоставляемые через Сервис, могут включать:
          </p>
          <ul class="legal-list">
            <li>информацию из открытых источников;</li>
            <li>авторские материалы Администрации и/или третьих лиц;</li>
            <li>аналитические обзоры, подборки, рекомендации, структурированные данные.</li>
          </ul>
          <p class="legal-paragraph">
            2.3. Пользователь осознаёт и соглашается, что ценность цифровых товаров и услуг
            Сервиса заключается <strong>в систематизации, анализе, форме подачи, сопровождении,
            поддержке и обновлениях</strong>, а не в эксклюзивности отдельных фрагментов
            информации.
          </p>
          <p class="legal-paragraph">
            2.4. Сервис не заявляет и не гарантирует уникальность, исключительность или
            недоступность отдельных элементов материалов вне Сервиса.
          </p>
        </section>

        <section class="legal-section">
          <h2 class="legal-heading text-mainText">3. Отказ от гарантий и ответственности</h2>
          <p class="legal-paragraph">
            3.1. Сервис предоставляется на условиях <strong>«AS IS» («как есть»)</strong>.
          </p>
          <p class="legal-paragraph">3.2. Администрация не гарантирует:</p>
          <ul class="legal-list">
            <li>соответствие Сервиса ожиданиям Пользователя;</li>
            <li>
              достижение каких-либо финансовых, коммерческих, профессиональных или иных
              результатов;
            </li>
            <li>бесперебойную и безошибочную работу Сервиса.</li>
          </ul>
          <p class="legal-paragraph">3.3. Администрация не несёт ответственности за:</p>
          <ul class="legal-list">
            <li>любые прямые или косвенные убытки, включая упущенную выгоду;</li>
            <li>последствия применения Пользователем полученных материалов;</li>
            <li>действия или бездействие третьих лиц;</li>
            <li>временные технические сбои и ограничения доступа.</li>
          </ul>
          <p class="legal-paragraph">
            3.4. Все решения о применении материалов, рекомендаций и услуг принимаются
            Пользователем <strong>самостоятельно и на его риск</strong>.
          </p>
        </section>

        <section class="legal-section">
          <h2 class="legal-heading text-mainText">4. Законность использования</h2>
          <p class="legal-paragraph">
            4.1. Сервис не предназначен для поощрения, организации или содействия противоправной
            деятельности.
          </p>
          <p class="legal-paragraph">
            4.2. Пользователь обязуется использовать Сервис исключительно в рамках применимого
            законодательства и правил третьих сторон.
          </p>
          <p class="legal-paragraph">
            4.3. Ответственность за законность использования материалов и услуг Сервиса полностью
            возлагается на Пользователя.
          </p>
        </section>

        <section class="legal-section">
          <h2 class="legal-heading text-mainText">5. Интеллектуальная собственность</h2>
          <p class="legal-paragraph">
            5.1. Все материалы, размещённые в Сервисе, охраняются законодательством об
            интеллектуальной собственности.
          </p>
          <p class="legal-paragraph">
            5.2. Пользователю запрещается копировать, распространять, перепродавать, передавать
            третьим лицам или иным образом использовать материалы Сервиса без разрешения
            правообладателя.
          </p>
          <p class="legal-paragraph">
            5.3. Нарушение прав интеллектуальной собственности может повлечь ограничение доступа к
            Сервису без компенсации.
          </p>
        </section>

        <section class="legal-section">
          <h2 class="legal-heading text-mainText">6. Ограничение доступа</h2>
          <p class="legal-paragraph">
            6.1. Администрация вправе приостановить или ограничить доступ Пользователя к Сервису в
            случае:
          </p>
          <ul class="legal-list">
            <li>нарушения условий настоящего Соглашения;</li>
            <li>выявления злоупотреблений;</li>
            <li>требований законодательства или платёжных провайдеров.</li>
          </ul>
          <p class="legal-paragraph">
            6.2. Ограничение доступа не освобождает Пользователя от обязательств, возникших ранее.
          </p>
          <p class="legal-paragraph">
            6.3. Администрация оставляет за собой право отказывать в обслуживании Пользователям,
            чьи действия могут создавать повышенные риски для Сервиса, платёжных провайдеров или
            третьих лиц.
          </p>
        </section>

        <section class="legal-section">
          <h2 class="legal-heading text-mainText">7. Платежи и возвраты</h2>
          <p class="legal-paragraph">
            7.1. Оплата услуг и цифровых товаров производится на условиях, указанных в Сервисе до
            момента оплаты.
          </p>
          <p class="legal-paragraph">
            7.2. В связи с нематериальным характером цифровых товаров и услуг,
            <strong>возврат денежных средств после предоставления доступа не осуществляется</strong>,
            за исключением случаев, указанных ниже.
          </p>
          <p class="legal-paragraph">7.3. Возврат средств возможен только если:</p>
          <ul class="legal-list">
            <li>услуга не была оказана по технической вине Сервиса;</li>
            <li>доступ к цифровому товару фактически не был предоставлен.</li>
          </ul>
          <p class="legal-paragraph">
            7.4. Для рассмотрения вопроса о возврате Пользователь обязан обратиться в службу
            поддержки в течение <strong>48 часов</strong> с момента оплаты.
          </p>
          <p class="legal-paragraph">
            7.5. Срок рассмотрения заявки на возврат составляет до <strong>48 часов</strong> с
            момента обращения.
          </p>
          <p class="legal-paragraph">
            7.6. При одобрении заявки возврат денежных средств осуществляется в течение
            <strong>72 часов</strong>.
          </p>
          <p class="legal-paragraph">
            7.7. Пользователь подтверждает, что обязуется
            <strong>не инициировать возврат платежа (chargeback)</strong> через платёжные системы
            без предварительного обращения в службу поддержки Сервиса.
          </p>
        </section>

        <section class="legal-section">
          <h2 class="legal-heading text-mainText">8. Конфиденциальность</h2>
          <p class="legal-paragraph">
            8.1. Администрация может собирать минимально необходимые технические данные для
            обеспечения работы Сервиса.
          </p>
          <p class="legal-paragraph">
            8.2. Администрация принимает разумные меры для защиты данных, однако не гарантирует
            абсолютную безопасность передаваемой информации.
          </p>
        </section>

        <section class="legal-section">
          <h2 class="legal-heading text-mainText">9. Изменение условий</h2>
          <p class="legal-paragraph">
            9.1. Администрация вправе вносить изменения в настоящее Соглашение.
          </p>
          <p class="legal-paragraph">
            9.2. Актуальная версия Соглашения публикуется в Сервисе.
          </p>
          <p class="legal-paragraph">
            9.3. Продолжение использования Сервиса означает согласие Пользователя с обновлёнными
            условиями.
          </p>
        </section>

        <section class="legal-section">
          <h2 class="legal-heading text-mainText">10. Контактная информация</h2>
          <p class="legal-paragraph">
            10.1. По всем вопросам Пользователь может обратиться в службу поддержки:
          </p>
          <ul class="legal-list">
            <li>
              через
              <router-link to="/feedback" class="legal-link">страницу обратной связи</router-link>;
            </li>
            <li>
              по email:
              <a class="legal-link" href="mailto:support@re-market.net">support@re-market.net</a>.
            </li>
          </ul>
        </section>

        <section class="legal-section">
          <p class="legal-paragraph legal-accent">
            <strong>
              Используя Сервис, Пользователь
              подтверждает, что ознакомлен с настоящим Соглашением и принимает его условия в полном
              объёме.
            </strong>
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

.legal-accent {
  color: var(--text-primary);
}

.legal-link {
  color: rgb(var(--palette-blue-300));
  text-decoration: underline;
  text-underline-offset: 2px;
}

.legal-link:hover {
  color: rgb(var(--palette-blue-200));
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
