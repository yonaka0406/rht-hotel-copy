<template>
    <div>
      <WorkInProgress />
    </div>
  </template>
  
  <script>
    import WorkInProgress from "@/components/WorkInProgress.vue";
  
    export default {
        name: "ManageOTA",
        components: {
            WorkInProgress,
        },
    };
  </script>