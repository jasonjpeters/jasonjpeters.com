---
title: Development Environments, Local Clouds, and Distributed Systems with Incus
date: 2025-10-13
description: "Modern web development is rarely a single app anymore - it's a constellation of services."
tags:
  - linux
  - debian
  - virtualization
  - development
  - homelab
image: ./featured.webp
---

When we're building modern web projects together, we're rarely dealing with a single app or service. Whether it's my laptop or primary workstation, the setup usually looks like a constellation of services: web servers, APIs, databases, caches, queues, and background workers all trying to mimic production. 

Docker and VirtualBox each help, but they live at opposite ends of what we need. Docker gives us containers. VirtualBox gives us VMs. **Incus** gives us both—unified, scriptable, and resource-efficient. This is the workflow I rely on, and we'll walk through how to stand up a local cloud side by side so we can develop and test the whole stack without leaving our desks.

## Incus vs Docker, VirtualBox, and Friends

Here's how I frame the current tooling landscape when we're sizing up our local cloud experiments:

| Tool | Best For | Weakness |
|------|----------|----------|
| Docker | Packaging and deploying individual services | Hard to simulate full systems or custom networks |
| VirtualBox | Full desktop virtualization | Heavy and manual for complex topologies |
| Proxmox VE | Server-grade virtualization and clustering | GUI-centric, heavier setup |
| Incus | Local clusters of containers + VMs | CLI-centric (no default GUI) |

Docker is great for shipping applications. Incus is for simulating infrastructure. We can even run Docker inside an Incus container or VM — handy when we want to test how containerized workloads behave in different environments.

Incus is a **next-generation container and virtual machine manager** that lets us build full-stack distributed systems locally. I love how it matches the way I reason about projects: we can simulate production environments, test networked services, isolate client work, or experiment with infrastructure patterns — all without spinning up real cloud VMs.

## History of Incus

Incus has roots in **LXD**, Canonical’s container hypervisor built on **LXC (Linux Containers)**. LXD provided a clean API and CLI to manage both containers and VMs. It became beloved among developers who wanted lightweight, full-system containers that felt like mini-VMs.

In 2023, Canonical decided to internalize LXD’s development, removing it from the open Linux Containers project. The original maintainers — the same engineers who built LXD in the first place — [forked it into a new project](https://linuxcontainers.org/incus/announcement/) called **Incus**.

Today, **Incus** lives under [linuxcontainers.org](https://linuxcontainers.org/incus), fully open and community-governed, free from corporate oversight. Think of it as:

> LXD, but freer — and faster to evolve.

## Why Web Developers Should Care

Incus isn’t just a sysadmin’s toy — it’s an incredible tool for **application developers** like us.

Whenever we want to replicate a full production environment locally, complete with multiple hosts, private networks, and mixed OS types, Incus makes that almost trivial. I treat it as my rehearsal stage and pull you into the same mindset: the more we automate this, the easier collaboration becomes.

**Here’s what it brings to our shared workflow:**

- **Real operating systems** in containers — not just minimal app images.  
- **Virtual machines** for kernel-level or distro-specific testing.  
- **Unified management** for both containers and VMs through one CLI or REST API.  
- **Native networking** to model internal and external networks realistically.  
- **Profiles and projects** to isolate different applications or stacks.  

In short: Incus turns our machine (or a small server) into our own **mini data center**.

## Containers vs VMs in Incus

Incus supports two types of instances:

| Type | Ideal Use Case | Characteristics |
|------|----------------|-----------------|
| **System Container** | Lightweight services — web apps, databases, caches | Shares host kernel, near-native speed |
| **Virtual Machine** | Testing alternate OSes or kernel features | Full isolation via KVM/QEMU |

The magic lies in **unification**: containers and VMs use the same commands, same configuration, same network. We can start with a container-based stack, then swap one component into a VM without changing any muscle memory. When I reach for a different instance type, it’s because I reasoned through the trade-offs, and we can make the same call together on the fly.

## Install and Configure Incus

**Incus** is [available for a number of different Linux distributions](https://linuxcontainers.org/incus/docs/main/installing/#install-incus-from-a-package) such as Fedora, Ubuntu, Void Linux, and others. I run it on [Debian 13 Trixie](https://www.debian.org/), and I lean on [Zabbly's Debian packages](https://github.com/zabbly/incus?tab=readme-ov-file#availability) to stay current. Let’s go through the exact steps together so you can mirror the setup or adapt it to your distro.

### Zabbly Repository Setup

We start by giving APT access to the up-to-date package builds (Stable branch). That means creating a dedicated keyring directory, importing Zabbly’s signing key, and writing a `.sources` file so Debian knows about the new repository. Once the repo is registered, `apt update` refreshes the package index to include Incus.

```bash terminal copy title="Install Zabbly Repository" prompt="as root"
mkdir -p /etc/apt/keyrings
curl -fsSL https://pkgs.zabbly.com/key.asc -o /etc/apt/keyrings/zabbly.asc
sh -c 'cat <<EOF > /etc/apt/sources.list.d/zabbly-incus-stable.sources
Enabled: yes
Types: deb
URIs: https://pkgs.zabbly.com/incus/stable
Suites: $(. /etc/os-release && echo ${VERSION_CODENAME})
Components: main
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/zabbly.asc
EOF'
apt update
```

With the repository configured, we install Incus proper. Adding our user to the `incus-admin` group lets us control Incus without running each command as root, and enabling the service ensures the daemon starts automatically after a reboot.

```bash terminal copy title="Install and Configure Incus" prompt="as user" 
sudo apt install incus
sudo usermod -aG incus-admin $USER
sudo systemctl enable --now incus
```

Before we launch anything, we confirm the UID and GID mappings that Incus uses for unprivileged containers. These ranges let Incus safely translate container IDs into host IDs.

```bash terminal copy title="Verify ID Mapping" prompt="as user" 
cat /etc/sub{g,u}id
```
```sh
# /etc/subgid
<user>:100000:65536
root:1000000:1000000000
# /etc/subuid
<user>:100000:65536
root:1000000:1000000000
```

If the above command is missing `root:1000000:1000000000` in the output, we run:

```bash terminal copy title="Unprivileged Containers" prompt="as user" 
echo "root:1000000:1000000000" | sudo tee -a /etc/subuid /etc/subgid
```

This gives Incus permission to translate a very large range of UIDs and GIDs for use inside unprivileged containers, keeping them secure even if they think they are running as root.

After that we reboot the machine and initialize Incus:

```bash terminal copy title="Initialize Incus" prompt="as user" 
incus admin init
```

The initializer can create a managed bridge automatically, but I like to tweak it afterward. To give us an easy-to-remember subnet, we edit the bridge and assign it a 10.10.10.0/24 network.

```bash terminal copy title="Set IPv4" prompt="as user" 
incus network edit incusbr0
```

```yaml
config:
  ipv4.address: 10.10.10.1/24
  ...
```

With the bridge configured, we can launch containers or VMs, assign them static addresses, and stitch together the services that make up our local cloud. It feels just like production—only everything lives on the laptop sitting in front of us. Anytime I pause to make a networking decision, it’s so we stay aligned on how traffic should flow.

```bash terminal copy title="Launch your first container" prompt="as user"
incus launch images:alpine/edge db
incus ls
```
```
+------+---------+--------------------+------+-----------+-----------+
| NAME |  STATE  |        IPV4        | IPV6 |   TYPE    | SNAPSHOTS |
+------+---------+--------------------+------+-----------+-----------+
| db   | RUNNING | 10.10.10.10 (eth0) |      | CONTAINER | 0         |
+------+---------+--------------------+------+-----------+-----------+
```

### Helper Scripts I Keep Around

Below are a couple we can lean on together. They’re simple, but they save me time and reduce copy-paste mistakes when we’re iterating fast.

- `incus-static-ip`: quickly pins a container to a specific IP on our bridge. I use it whenever I am wiring services together and don’t want their addresses to drift.

```bash terminal copy title="/usr/local/bin/incus-static-ip" prompt=""
#!/usr/bin/env bash

read -p "Container Name: " name
read -p "IP Address: " ip

incus stop "$name"
incus network attach incusbr0 "$name" eth0 eth0
incus config device set "$name" eth0 ipv4.address "$ip"
incus start "$name"
```

- `incus-bind-dir`: mounts a host directory into a container so I can edit files locally and run them inside the instance.

```bash terminal copy title="/usr/local/bin/incus-bind-dir" prompt=""
#!/usr/bin/env bash

read -p "Container Name: " name
read -p "Device Name: " device 
read -p "Host Directory: " hdir
read -p "Container Directory: " cdir 

incus config device add "$name" "$device" disk source="$hdir" path="$cdir" shift=true
```

## UI Management

While I primarily manage Incus using the CLI, Incus has the ability to serve a UI that interacts with its API. This can be done by installing `incus-ui-canonical` provided by the Zabbly repository.

```bash terminal copy title="Install incus-ui-canonical" prompt="as user"
sudo apt install -y incus-ui-canonical
```

By default Incus is not listening on a web port we can reach directly through the browser. We activate the Incus Web server by setting the `core.https_address` to port number 8443. An alternate port can be used if needed.

```bash terminal copy title="Enable Incus network availability" prompt="as user"
incus config set core.https_address :8443
```

After this, point your browser to [https://127.0.0.1:8443](https://127.0.0.1:8443) and follow the on screen instructions to login.

If you are looking for more information about installing the UI checkout this article from [Simos Xenitellis - How to install and setup the Incus Web UI ](https://blog.simos.info/how-to-install-and-setup-the-incus-web-ui/)

## Example: Modeling a Distributed Web Stack

Here’s a sample environment I run when I want to rehearse a distributed stack:

- `app`: NGINX + PHP (Laravel, for example)  
- `db`: PostgreSQL  
- `cache`: ValKey/Redis
- `proxy`: HAProxy handling SSL 

We can build this entire system inside Incus containers, each with its own IP on a private bridge network, and wire it up exactly the way we expect it to behave in production. I like to diagram the traffic flow on a whiteboard first; once we agree on the shape, the Incus commands come quickly, and we have a reproducible environment we can tear down or rebuild at will.

## Wrapping Up

We just walked through the playbook I use to stand up a mini data center on a single machine with Incus, and hopefully you now have the same knobs to turn. From repositories and bridges to helper scripts and UI access, the workflow keeps us honest about how our distributed systems behave before they ever hit a real cloud. If you try this out, let me know what puzzles you run into—we can reason through the next iteration together, whether that’s adding observability tooling, expanding the cluster to another host, or automating instance creation with Terraform.

## Extra Resources

* [First steps with Incus](https://linuxcontainers.org/incus/docs/main/tutorial/first_steps/)
* [How to install and setup the Incus Web UI](https://blog.simos.info/how-to-install-and-setup-the-incus-web-ui/)
* [Prevent connectivity issues with Incus and Docker](https://linuxcontainers.org/incus/docs/main/howto/network_bridge_firewalld/#network-incus-docker)
* [How to configure your firewall](https://linuxcontainers.org/incus/docs/main/howto/network_bridge_firewalld/#network-bridge-firewall)
