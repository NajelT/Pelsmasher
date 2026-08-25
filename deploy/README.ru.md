# Деплой Pelsmasher на Hetzner

## Как это устроено

- **bootstrap-server.sh** — одноразовая настройка нового сервера: пакеты, PostgreSQL, systemd-юниты, пользователь `deploy` без root-прав, ежедневные бэкапы. Запускается один раз (и повторно — если нужно что-то переприменить), от `root`.
- **deploy.sh** — рутинный деплой: собирает frontend и backend, заливает на сервер и перезапускает сервис. Работает от имени непривилегированного пользователя `deploy` — root по SSH для этого больше не нужен. Этот же скрипт используется и вручную с твоего Mac, и в GitHub Actions.
- **.github/workflows/deploy.yml** — деплой по кнопке в GitHub (Actions → Deploy → Run workflow). Ключ от `deploy`-пользователя лежит в secrets репозитория.

## Первоначальная настройка нового сервера

```bash
ssh-keygen -t ed25519 -f ~/.ssh/pelsmasher_deploy -N "" -C "deploy@pelsmasher"
cd /Users/iljalushpajev/Documents/Pelsmasher
./deploy/bootstrap-server.sh IP_СЕРВЕРА ~/.ssh/pelsmasher_deploy.pub
```

Дальше один раз вручную (от root) заливаются systemd/nginx конфиги:

```bash
scp deploy/pelsmasher-backend.service root@IP_СЕРВЕРА:/etc/systemd/system/pelsmasher-backend.service
scp deploy/nginx-pelsmasher.conf root@IP_СЕРВЕРА:/etc/nginx/sites-available/pelsmasher
ssh root@IP_СЕРВЕРА 'ln -sf /etc/nginx/sites-available/pelsmasher /etc/nginx/sites-enabled/pelsmasher && rm -f /etc/nginx/sites-enabled/default && systemctl daemon-reload && systemctl enable pelsmasher-backend && nginx -t && systemctl reload nginx'
```

## Деплой изменений (после первоначальной настройки)

**Вручную с Mac:**

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/pelsmasher_deploy
cd /Users/iljalushpajev/Documents/Pelsmasher
SSH_USER=deploy ./deploy/deploy.sh IP_СЕРВЕРА
```

**Через GitHub Actions (по кнопке):**

1. В настройках репозитория `Settings → Secrets and variables → Actions` добавь:
   - `DEPLOY_SSH_KEY` — приватный ключ `~/.ssh/pelsmasher_deploy` целиком (`pbcopy < ~/.ssh/pelsmasher_deploy`, вставить как есть)
   - `DEPLOY_HOST` — IP сервера
2. Вкладка `Actions` → `Deploy` → `Run workflow`.

Деплой не автоматический на каждый push — запускается только вручную кнопкой. Это осознанный выбор, пока в проекте нет тестов: удобнее решать самому, когда катить на прод.

## Миграции базы данных (Flyway)

Схема управляется через Flyway (`backend/src/main/resources/db/migration/`), а не через Hibernate `ddl-auto`. `V1__baseline.sql` — снимок схемы на момент перехода с H2 на Postgres.

Чтобы изменить схему:

1. Создай новый файл `backend/src/main/resources/db/migration/V2__что_то.sql` (нумерация по возрастанию, имя после `__` — просто описание).
2. Напиши в нём чистый SQL (`ALTER TABLE ...`, `CREATE INDEX ...` и т.д.).
3. Задеплой как обычно — Flyway применит новую миграцию автоматически при старте бэкенда.

Никогда не редактируй уже применённую миграцию (`V1`, `V2`, ...) — Flyway хранит контрольные суммы и откажется стартовать, если файл изменился после применения. Для правок делай новую миграцию.

## База данных

- Локально: `docker compose up -d` в `backend/` — Postgres на `127.0.0.1:5432`, база/юзер/пароль `pelsmasher`/`pelsmasher`/`pelsmasher`.
- На проде: Postgres слушает только `127.0.0.1` (не торчит наружу). Подключаться через SSH-туннель:
  ```bash
  ssh -N -L 5433:127.0.0.1:5432 root@IP_СЕРВЕРА
  ```
  затем TablePlus/psql на `127.0.0.1:5433`, база `pelsmasher`, юзер `pelsmasher`. Пароль — в `/etc/pelsmasher/backend.env` на сервере (сгенерирован один раз при бутстрапе).
- Бэкапы: ежедневно в 03:30 UTC (`systemctl status pelsmasher-backup.timer`), хранятся в `/var/backups/pelsmasher/` на сервере, ротация — 14 дней.

## Если что-то пошло не так

Проверить backend на сервере:

```bash
ssh root@IP_СЕРВЕРА
systemctl status pelsmasher-backend
journalctl -u pelsmasher-backend -n 80 --no-pager
```

Проверить Nginx:

```bash
nginx -t
systemctl status nginx
```

Перезапустить backend (можно и от `deploy`-пользователя, без root):

```bash
sudo systemctl restart pelsmasher-backend
```
