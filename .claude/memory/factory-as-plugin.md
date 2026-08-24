---
name: factory-as-plugin
description: How the factory lives in its own repo as a Claude Code plugin — the settings that turn it on, and the one trap that breaks a bundled script.
metadata:
  type: reference
---

The line is not in this repo. It is a Claude Code plugin, `ai-factory`, installed from the
`poszet-plugins` marketplace. A plugin can hold **any** file, so `factory/*.yaml`, the slot
contracts and the Node scripts all travel with it.

**How this repo turns it on.** Two keys in `.claude/settings.json`, committed:

```json
"extraKnownMarketplaces": {
  "poszet-plugins": { "source": { "source": "github", "repo": "poszetkristof/ai-factory" } }
},
"enabledPlugins": { "ai-factory@poszet-plugins": true }
```

The key is `enabledPlugins`, not `plugins`, and its value is an object, not a list. Installing from
the `/plugin` menu writes this into the **user** settings file, which no clone gets. It belongs
here instead.

**The trap.** `${CLAUDE_PLUGIN_ROOT}` is replaced in the **text** of a command, skill or agent. It
is never set as an environment variable for the process that command starts. A script reading
`process.env.CLAUDE_PLUGIN_ROOT` gets nothing, falls back to the project folder, and then all eight
roles report "adapter missing". A script must find the plugin from its own location:

```js
const FACTORY_ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
```

Hooks are the exception — they do get the real environment variables.

**The one limit.** A plugin cannot supply `CLAUDE.md`. Only four scopes exist: managed policy,
user, project, local. So every repo keeps its own.

**Why the generated agents live in the plugin too.** `derive-agents.mjs` then runs in that repo's
own CI, beside the slot contracts it reads, so the check that fails on a hand-edited agent keeps
working.

Docs: <https://code.claude.com/docs/en/plugins-reference>. The walkthrough, including what goes
wrong on install, is in `docs/learn/ai-native-delivery.md`, section 4.

See [[decisions-made]].
