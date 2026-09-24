export type SupportFaqNode = {
  id: string
  label: string
  reply: string
  children?: SupportFaqNode[]
}

export const SUPPORT_FAQ_ROOT_RU: SupportFaqNode[] = [
  {
    id: 'balance',
    label: 'Баланс',
    reply: 'Выберите вопрос по балансу ниже.',
    children: [
      {
        id: 'balance-topup',
        label: 'Пополнение баланса',
        reply: 'Откройте Профиль -> Баланс -> введите сумму -> выберите способ оплаты и завершите платеж.',
      },
      {
        id: 'balance-currency',
        label: 'Валюта операций',
        reply: 'Все операции на сайте проходят в RUB. Если карта в другой валюте, конвертация выполняется платежной системой.',
      },
      {
        id: 'balance-not-credited',
        label: 'Деньги не зачислились',
        reply: 'Если платеж прошел, но баланс не обновился, дождитесь до 15 минут и проверьте историю. Если не помогло, откройте спор из сделки с подтверждением оплаты.',
      },
      {
        id: 'balance-methods',
        label: 'Способы оплаты',
        reply: 'Актуальные способы оплаты показываются в момент пополнения. Список может меняться по региону и провайдеру.',
      },
    ],
  },
  {
    id: 'buyers',
    label: 'Для покупателей',
    reply: 'Выберите вопрос по покупке товара.',
    children: [
      {
        id: 'buyers-how-buy',
        label: 'Как купить товар',
        reply: 'Откройте карточку товара, нажмите Купить, оплатите заказ, затем получите выдачу в чате сделки.',
      },
      {
        id: 'buyers-no-delivery',
        label: 'Товар не выдали',
        reply: 'Если продавец не выдал товар, не подтверждайте получение и откройте спор по сделке через кнопку Пожаловаться.',
      },
      {
        id: 'buyers-refund',
        label: 'Возврат средств',
        reply: 'Возврат рассматривается по истории сделки. Для запуска проверки обратитесь в поддержку из конкретной сделки.',
      },
    ],
  },
  {
    id: 'sellers',
    label: 'Для продавцов',
    reply: 'Выберите вопрос по продажам.',
    children: [
      {
        id: 'sellers-payout',
        label: 'Когда зачисляются средства',
        reply: 'Средства зачисляются после успешного завершения сделки и подтверждения получения покупателем.',
      },
      {
        id: 'sellers-dispute',
        label: 'Спор с покупателем',
        reply: 'В споре важно сохранять общение и выдачу в рамках чата сделки. Поддержка рассматривает логи и статусные события.',
      },
      {
        id: 'sellers-listing',
        label: 'Модерация товара',
        reply: 'Проверьте, что описание, цена и условия выдачи прозрачны и соответствуют товару. Это ускоряет публикацию.',
      },
    ],
  },
  {
    id: 'account',
    label: 'Аккаунт и безопасность',
    reply: 'Выберите вопрос по аккаунту.',
    children: [
      {
        id: 'account-reset',
        label: 'Сброс пароля',
        reply: 'Используйте восстановление пароля на странице входа. Ссылка придет на привязанную почту.',
      },
      {
        id: 'account-2fa',
        label: 'Защита аккаунта',
        reply: 'Рекомендуем включить 2FA, использовать сложный пароль и не передавать коды подтверждения третьим лицам.',
      },
      {
        id: 'account-block',
        label: 'Блокировка аккаунта',
        reply: 'Если считаете блокировку ошибочной, оставьте обращение через feedback или напишите из сделки, где возникла проблема.',
      },
    ],
  },
  {
    id: 'site',
    label: 'Сайт и функционал',
    reply: 'Выберите вопрос по работе сайта.',
    children: [
      {
        id: 'site-slow',
        label: 'Сайт работает медленно',
        reply: 'Обновите страницу, отключите VPN/прокси, попробуйте другой браузер. При массовом сбое информация обычно появляется в каналах проекта.',
      },
      {
        id: 'site-notifications',
        label: 'Не приходят уведомления',
        reply: 'Проверьте настройки уведомлений в профиле и разрешения браузера на push-уведомления.',
      },
      {
        id: 'site-images',
        label: 'Ошибка загрузки изображений',
        reply: 'Проверьте формат и размер файла, затем повторите загрузку. Для JPG/PNG обычно проблем не возникает.',
      },
    ],
  },
]

export const SUPPORT_FAQ_ROOT_EN: SupportFaqNode[] = [
  {
    id: 'balance',
    label: 'Balance',
    reply: 'Choose a balance-related question below.',
    children: [
      {
        id: 'balance-topup',
        label: 'Top up balance',
        reply: 'Open Profile -> Balance -> enter amount -> choose payment method and complete payment.',
      },
      {
        id: 'balance-currency',
        label: 'Operation currency',
        reply: 'All operations are processed in RUB. If your card uses another currency, conversion is done by the payment provider.',
      },
      {
        id: 'balance-not-credited',
        label: 'Funds not credited',
        reply: 'If payment succeeded but balance did not update, wait up to 15 minutes and check history. If still missing, open support from the related deal with payment proof.',
      },
    ],
  },
  {
    id: 'buyers',
    label: 'For buyers',
    reply: 'Choose a question about buying.',
    children: [
      {
        id: 'buyers-how-buy',
        label: 'How to buy',
        reply: 'Open product page, click Buy, complete payment, then receive delivery inside deal chat.',
      },
      {
        id: 'buyers-no-delivery',
        label: 'No delivery from seller',
        reply: 'Do not confirm receipt. Open a dispute from the deal using the Report button.',
      },
    ],
  },
  {
    id: 'account',
    label: 'Account and security',
    reply: 'Choose an account question.',
    children: [
      {
        id: 'account-reset',
        label: 'Password reset',
        reply: 'Use password recovery on sign-in page. A reset link will be sent to your email.',
      },
      {
        id: 'account-2fa',
        label: 'Account protection',
        reply: 'Enable 2FA, use a strong password, and never share verification codes.',
      },
    ],
  },
]

export const SUPPORT_FAQ_ROOT_INTRO = {
  ru: 'Бот поддержки поможет найти быстрый ответ.\n\nВыберите тему ниже. Если вопрос касается конкретного товара или оплаты по сделке, обращайтесь в поддержку из этой сделки.',
  en: 'Support bot helps you find quick answers.\n\nChoose a topic below. If your issue is about a specific product or deal payment, contact support from that deal.',
} as const

export const SUPPORT_FAQ_NAV_TEXT = {
  ru: {
    back: 'Назад',
    root: 'В начало',
    rootLabel: 'Главные темы',
    levelUpReply: 'Возвращаюсь на уровень выше.',
    rootReply: 'Открываю главное меню FAQ.',
    showMoreQuestions: 'Показать еще вопросы',
    showMoreReply: 'Показываю доступные вопросы.',
    botName: 'Бот',
  },
  en: {
    back: 'Back',
    root: 'Main menu',
    rootLabel: 'Main topics',
    levelUpReply: 'Going one level up.',
    rootReply: 'Opening the main FAQ menu.',
    showMoreQuestions: 'Show more questions',
    showMoreReply: 'Showing available questions.',
    botName: 'Bot',
  },
} as const
