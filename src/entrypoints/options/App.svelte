<script lang="ts">
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from '$lib/components/ui/card'
  import { ModeWatcher } from 'mode-watcher'
  import Dataset from './components/Dataset.svelte'
  import Form from './components/Form.svelte'
  import { GithubIcon } from 'lucide-svelte'
  import DarkMode from './components/DarkMode.svelte'
  import { Button } from '$lib/components/ui/button'
  import { Toaster } from '$lib/components/ui/sonner'
</script>

<Card class="container my-8 p-0 md:p-8 border-none">
  <CardHeader class="pb-4">
    <CardTitle class="flex items-center gap-2">
      <span class="text-xl font-bold mr-auto">Redirector</span>
      <DarkMode />
      <a href="https://github.com/rxliuli/redirector" target="_blank">
        <Button variant="outline" size="icon">
          <GithubIcon
            class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all text-yellow-500"
          />
        </Button>
      </a>
    </CardTitle>
  </CardHeader>
  <CardContent>
    <Form />
    <Dataset />
  </CardContent>
</Card>
<ModeWatcher />
<Toaster richColors />

<style>
</style>
