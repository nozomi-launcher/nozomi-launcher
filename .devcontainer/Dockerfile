FROM debian:bookworm-slim

ARG USERNAME=dev
ARG USER_UID=1000
ARG USER_GID=${USER_UID}
ARG NODE_MAJOR=24
ARG RUST_VERSION=stable
ARG PNPM_VERSION=10.33.0

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# ── System packages ──────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Core dev tools
    build-essential \
    curl \
    wget \
    git \
    pkg-config \
    ca-certificates \
    gnupg \
    sudo \
    # OpenSSL (required by openssl-sys crate)
    libssl-dev \
    # Tauri v2 Linux dependencies (WebKitGTK + related)
    libwebkit2gtk-4.1-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf \
    libgtk-3-dev \
    libsoup-3.0-dev \
    libjavascriptcoregtk-4.1-dev \
    # GUI / display forwarding
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    libxtst6 \
    libpango1.0-0 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libasound2 \
    libdbus-1-3 \
    dbus \
    xdg-utils \
    # Wayland support
    libwayland-client0 \
    # OpenGL / Vulkan (Mesa software renderers for headless / container use)
    libgl1-mesa-dri \
    libegl1-mesa \
    libgles2-mesa \
    mesa-vulkan-drivers \
    mesa-utils \
    vulkan-tools \
    # Locale support
    locales \
    && rm -rf /var/lib/apt/lists/*

# ── Locale ───────────────────────────────────────────────────────────────────
RUN sed -i '/en_US.UTF-8/s/^# //' /etc/locale.gen && locale-gen
ENV LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8

# ── Non-root user ────────────────────────────────────────────────────────────
RUN groupadd --gid ${USER_GID} ${USERNAME} \
    && useradd --uid ${USER_UID} --gid ${USER_GID} -m ${USERNAME} -s /bin/bash \
    && echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/${USERNAME} \
    && chmod 0440 /etc/sudoers.d/${USERNAME}

# ── Node.js ──────────────────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── Switch to non-root user for Rust + pnpm installs ────────────────────────
USER ${USERNAME}
WORKDIR /home/${USERNAME}

# ── Rust (rustup) ────────────────────────────────────────────────────────────
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    --default-toolchain ${RUST_VERSION} \
    && . "$HOME/.cargo/env" \
    && rustup component add clippy rustfmt

ENV PATH="/home/${USERNAME}/.cargo/bin:${PATH}"

# ── pnpm ─────────────────────────────────────────────────────────────────────
RUN sudo npm install -g pnpm@${PNPM_VERSION}

# ── Tauri CLI (installed globally for convenience) ───────────────────────────
RUN cargo install tauri-cli --locked

WORKDIR /workspace
