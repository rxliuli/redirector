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
  import { StarIcon } from 'lucide-svelte'
</script>

<Card class="container my-8">
  <CardHeader>
    <CardTitle class="flex items-center gap-2">
      <span class="text-xl font-bold">Redirector</span>
      <a
        href="https://github.com/rxliuli/redirector"
        target="_blank"
        class="ml-auto"
      >
        <StarIcon class="w-4 h-4 text-yellow-500" />
      </a>
    </CardTitle>
  </CardHeader>
  <CardContent>
    <Form />
    <Dataset />
  </CardContent>
</Card>
<ModeWatcher />

<style>
</style>
