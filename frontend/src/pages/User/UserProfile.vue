<template>
  <div class="p-4">
    <Toast />
    <Panel header="Google Calendar Integration">
      <div v-if="loading" class="text-center">Loading user settings...</div>
      <div v-else-if="error" class="text-red-500">{{ error }}</div>
      <div v-else>
        <div class="field grid items-center mb-4">
          <label for="syncToggle" class="col-fixed w-[200px] font-semibold">Enable Calendar Sync:</label>
          <ToggleSwitch id="syncToggle" v-model="syncPreference" @change="handleSyncChange" class="ml-2"/>
        </div>

        <div class="field mb-4">
          <Button @click="setupDedicatedCalendar" 
                  :label="currentUser && currentUser.google_calendar_id ? 'Re-Initialize Dedicated Calendar' : 'Setup Dedicated Calendar'" 
                  icon="pi pi-calendar-plus" 
                  class="p-button-primary mr-2"
                  :loading="isSubmitting && !isSyncingCalendar" 
                  :disabled="isSubmitting || isSyncingCalendar" />
          <p v-if="currentUser && currentUser.google_calendar_id" class="text-sm mt-2 text-gray-600 inline-block">
            Dedicated Calendar ID: {{ currentUser.google_calendar_id }}
          </p>
          <p v-else class="text-sm mt-2 text-gray-600">
            Click to create a dedicated calendar in your Google Calendar account for CRM events.
          </p>
        </div>

        <div class="field">
            <Button 
                label="Sync Calendar Now" 
                icon="pi pi-sync" 
                @click="handleManualSync" 
                :loading="isSyncingCalendar" 
                :disabled="isSubmitting || isSyncingCalendar"
                class="p-button-secondary" 
            />
            <p class="text-xs mt-1 text-gray-500">
                Manually synchronize events from your Google Calendar to the CRM.
            </p>
        </div>

        <p class="text-xs mt-4 text-gray-500">
            Note: Enabling sync or setting up the calendar may require you to grant permissions to our application via Google.
            If you encounter issues, try logging out and logging back in with your Google account to refresh permissions for the new calendar scopes.
        </p>
      </div>
    </Panel>

    <Panel header="Embedded Google Calendar" class="mt-4" :toggleable="true" :collapsed="!showCalendar" @update:collapsed="handlePanelToggle">
        <template #icons>
            <Button 
                :icon="showCalendar ? 'pi pi-eye-slash' : 'pi pi-eye'" 
                class="p-panel-header-icon p-link mr-2" 
                @click="loadAndToggleCalendar" 
                v-tooltip.top="showCalendar ? 'Hide Calendar' : 'Show Calendar'" 
            />
        </template>
        <div v-if="showCalendar">
            <div v-if="isLoadingCalendar" class="text-center">
                <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" animationDuration=".5s"/>
                <p>Loading Calendar...</p>
            </div>
            <div v-else-if="localEmbedUrl">
                <iframe :src="localEmbedUrl" style="border:solid 1px #ccc; border-radius: 4px;" width="100%" height="600" frameborder="0" scrolling="yes"></iframe>
            </div>
            <div v-else class="text-red-500 text-center p-4">
                Could not load calendar. Ensure sync is enabled and a calendar is set up. You might need to re-authenticate with Google.
            </div>
        </div>
         <p v-else class="text-sm text-gray-500">
            Click the eye icon in the panel header to show/hide the embedded Google Calendar.
            The calendar displayed will be your dedicated CRM calendar if one was set up, otherwise it will be your primary Google Calendar.
        </p>
    </Panel>

  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import Panel from 'primevue/panel';
import ToggleSwitch from 'primevue/toggleswitch';
import Button from 'primevue/button';
import Toast from 'primevue/toast';
import ProgressSpinner from 'primevue/progressspinner'; 
import { useUserStore } from '@/composables/useUserStore';
import { useToast } from 'primevue/usetoast';

export default {
  name: 'UserProfile',
  components: { Panel, ToggleSwitch, Button, Toast, ProgressSpinner },
  setup() {
    const userStore = useUserStore();
    const toast = useToast();

    const loading = ref(true); 
    const error = ref(null);
    const isSubmitting = ref(false); // For preference changes
    const isSyncingCalendar = ref(false); // For manual sync button

    const syncPreference = ref(false);

    const localEmbedUrl = ref(''); 
    const isLoadingCalendar = ref(false);
    const showCalendar = ref(false); 

    const currentUser = computed(() => userStore.logged_user.value && userStore.logged_user.value[0] ? userStore.logged_user.value[0] : null);

    onMounted(async () => {
      loading.value = true;
      error.value = null;
      try {
        if (!currentUser.value || !currentUser.value.hasOwnProperty('sync_google_calendar')) {
             await userStore.fetchUser();
        }
        if (currentUser.value) {
            syncPreference.value = !!currentUser.value.sync_google_calendar;
        } else {
            error.value = 'Failed to load user data for settings.';
        }
      } catch (e) {
        error.value = 'Failed to load user settings.';
        console.error("Error in onMounted UserProfile:", e);
        toast.add({ severity: 'error', summary: 'Loading Error', detail: error.value, life: 3000 });
      } finally {
        loading.value = false;
      }
    });

    const handleSyncChange = async () => {
      if (isSubmitting.value || isSyncingCalendar.value) return;
      isSubmitting.value = true;
      error.value = null;
      try {
        const updatedSettings = await userStore.updateUserCalendarPreferencesStore({ 
          sync_preference: syncPreference.value 
        });
        if (updatedSettings && typeof updatedSettings.sync_google_calendar !== 'undefined') {
            syncPreference.value = !!updatedSettings.sync_google_calendar;
             toast.add({ severity: 'success', summary: 'Success', detail: 'Sync preference updated!', life: 3000 });
        } else {
            throw new Error("Update response was not as expected.");
        }
      } catch (err) {
        syncPreference.value = !syncPreference.value; 
        error.value = err.message || 'Failed to update preference.';
        toast.add({ severity: 'error', summary: 'Update Error', detail: error.value, life: 3000 });
      } finally {
        isSubmitting.value = false;
      }
    };

    const setupDedicatedCalendar = async () => {
      if (isSubmitting.value || isSyncingCalendar.value) return;
      isSubmitting.value = true;
      error.value = null;
      try {
        const updatedSettings = await userStore.updateUserCalendarPreferencesStore({ 
          create_calendar: true 
        });
        if (updatedSettings && typeof updatedSettings.sync_google_calendar !== 'undefined') {
            syncPreference.value = !!updatedSettings.sync_google_calendar;
            toast.add({ severity: 'success', summary: 'Success', detail: 'Dedicated calendar setup processed!', life: 3000 });
            if (showCalendar.value && updatedSettings.google_calendar_id !== localEmbedUrl.value.split("src=")[1]?.split("&")[0]) {
                 localEmbedUrl.value = ''; 
                 await loadAndToggleCalendar(true); 
            }
        } else {
            throw new Error("Update response was not as expected.");
        }
      } catch (err) {
        error.value = err.message || 'Failed to setup dedicated calendar.';
        toast.add({ severity: 'error', summary: 'Setup Error', detail: error.value, life: 3000 });
      } finally {
        isSubmitting.value = false;
      }
    };

    const loadAndToggleCalendar = async (forceShow = null) => {
        const targetShowState = forceShow !== null ? forceShow : !showCalendar.value;
        if (targetShowState === false) { 
            showCalendar.value = false;
            return;
        }
        showCalendar.value = true; 
        if (localEmbedUrl.value && !forceShow) { 
            return;
        }
        isLoadingCalendar.value = true;
        error.value = null; 
        try {
            const url = await userStore.fetchCalendarEmbedUrlStore();
            if (url) {
                localEmbedUrl.value = url;
            } else {
                throw new Error("Embed URL was not returned from the store.");
            }
        } catch (err) {
            toast.add({ severity: 'error', summary: 'Calendar Error', detail: 'Could not load calendar URL.', life: 3000 });
            localEmbedUrl.value = ''; 
        } finally {
            isLoadingCalendar.value = false;
        }
    };
    
    const handlePanelToggle = (event) => {
        if (!event.collapsed && !localEmbedUrl.value && !isLoadingCalendar.value) {
            loadAndToggleCalendar(true); 
        } else if (event.collapsed) {
            showCalendar.value = false;
        } else {
            showCalendar.value = true;
        }
    };

    const handleManualSync = async () => {
        if (isSubmitting.value || isSyncingCalendar.value) return;
        isSyncingCalendar.value = true;
        error.value = null; // Clear previous main page errors
        try {
          const response = await userStore.triggerCalendarSyncStore();
          toast.add({ 
            severity: 'success', 
            summary: 'Calendar Sync', 
            detail: response.message || 'Synchronization with Google Calendar has completed.', 
            life: 5000 
          });
          // Optionally, display more details from response.details if needed
          if (response.details) {
            console.log("Sync details:", response.details);
            // Could add more toasts for created/updated/failed counts
            let detailMsg = `Created: ${response.details.actionsCreated}, Updated: ${response.details.actionsUpdated}, Failed: ${response.details.actionsFailed}`;
             toast.add({ severity: 'info', summary: 'Sync Stats', detail: detailMsg, life: 6000 });
          }
        } catch (err) {
          toast.add({ 
            severity: 'error', 
            summary: 'Sync Error', 
            detail: err.message || 'Could not sync with Google Calendar.', 
            life: 5000 
          });
          error.value = err.message; // Display error on page if needed
        } finally {
          isSyncingCalendar.value = false;
        }
      };

    return { 
      currentUser, 
      syncPreference, 
      handleSyncChange, 
      setupDedicatedCalendar,
      loading,
      error,
      isSubmitting,
      localEmbedUrl,
      isLoadingCalendar,
      showCalendar,
      loadAndToggleCalendar,
      handlePanelToggle,
      isSyncingCalendar, // expose new state
      handleManualSync   // expose new method
    };
  }
}
</script>

<style scoped>
/* Add any specific styles if needed */
.field.grid {
  display: grid;
  grid-template-columns: auto 1fr; /* Adjust column sizing as needed */
  align-items: center;
}
.p-panel-content {
    min-height: 100px; 
}
iframe {
    min-height: 580px; /* Ensure iframe itself has a good min height */
}
</style>
