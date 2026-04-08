# Chat Mobile

Готовый Expo / React Native клиент к существующему backend API.

## Что уже готово

- вход
- регистрация
- список чатов
- поиск пользователей и создание диалога
- переписка
- realtime через Socket.IO
- unread badges

По умолчанию приложение смотрит в production backend:

```text
https://api.chat-q.ru
```

То есть для обычного использования APK можно собирать и ставить без дополнительной настройки `.env`.

## Локальный запуск

```bash
cd chat-mobile
yarn
yarn typecheck
yarn start
```

Если хотите тестировать не production, а локальный backend, создайте `.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
```

Для реального телефона это должен быть LAN IP компьютера с backend, не `localhost`.

## Сборка APK

Нужен аккаунт Expo / EAS.

```bash
cd chat-mobile
yarn eas login
yarn apk
```

Используется профиль `production-apk` из `eas.json`, который собирает installable APK.

После завершения EAS даст ссылку на скачивание `.apk`. Скачайте его на телефон и установите.

## Полезные команды

```bash
yarn typecheck
yarn doctor
yarn apk
```

## Идентификаторы приложения

- Android package: `ru.chatq.mobile`
- iOS bundle id: `ru.chatq.mobile`

## Примечание

Root/admin-панель из web-клиента сюда пока не переносилась.
