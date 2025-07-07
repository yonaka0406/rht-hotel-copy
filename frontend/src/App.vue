<template>
  <div id="app">
    <Toast />
    <ConfirmDialog />
    <main>
        <router-view></router-view>
    </main>
  </div>
</template>

<script>
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog'; // Import ConfirmDialog

export default {
  name: 'App',
  components: {
    Toast,
    ConfirmDialog, // Register ConfirmDialog
  },
}
</script>

<style>

</style>
