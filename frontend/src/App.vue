<template>
  <div id="app">
    <Toast />
    <main>
        <router-view></router-view>
    </main>
  </div>
</template>

<script>
import Toast from 'primevue/toast';
export default {
  name: 'App',
  components: {
    Toast,
  },
}
</script>

<style>

</style>
