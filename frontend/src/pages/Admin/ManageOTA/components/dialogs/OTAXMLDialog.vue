<template>
  <Dialog 
    :visible="visible" 
    modal 
    :header="dialogTitle"
    :style="{ width: '90vw', maxWidth: '1200px' }"
    class="ota-xml-dialog"
    @update:visible="$emit('update:visible', $event)"
    @hide="$emit('hide')"
  >
    <div v-if="loading" class="flex justify-center items-center py-8">
      <ProgressSpinner />
      <span class="ml-3">XML データを読み込み中...</span>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <Message severity="error" :closable="false">
        {{ error }}
      </Message>
    </div>

    <div v-else-if="xmlData" class="ota-xml-content">
      <!-- XML Metadata -->
      <Card class="mb-4">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-info-circle text-blue-500"></i>
            XML メタデータ
          </div>
        </template>
        <template #content>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div class="text-sm font-semibold text-gray-600">サービス名</div>
              <div class="text-lg">{{ xmlData.service_name }}</div>
            </div>
            <div>
              <div class="text-sm font-semibold text-gray-600">リクエストID</div>
              <div class="font-mono text-sm">{{ xmlData.current_request_id }}</div>
            </div>
            <div>
              <div class="text-sm font-semibold text-gray-600">ステータス</div>
              <Badge 
                :value="getStatusText(xmlData.status)"
                :severity="getStatusSeverity(xmlData.status)"
              />
            </div>
            <div>
              <div class="text-sm font-semibold text-gray-600">再試行回数</div>
              <div>{{ xmlData.retries || 0 }}</div>
            </div>
            <div>
              <div class="text-sm font-semibold text-gray-600">作成日時</div>
              <div>{{ formatDateTime(xmlData.created_at) }}</div>
            </div>
            <div v-if="xmlData.processed_at">
              <div class="text-sm font-semibold text-gray-600">処理日時</div>
              <div>{{ formatDateTime(xmlData.processed_at) }}</div>
            </div>
          </div>
          
          <div v-if="xmlData.last_error" class="mt-4">
            <div class="text-sm font-semibold text-gray-600 mb-2">最後のエラー</div>
            <div class="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
              {{ xmlData.last_error }}
            </div>
          </div>
        </template>
      </Card>

      <!-- XML Content -->
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="pi pi-code text-green-500"></i>
              XML コンテンツ
            </div>
            <div class="flex gap-2">
              <Button
                label="コピー"
                icon="pi pi-copy"
                size="small"
                severity="secondary"
                @click="copyXMLToClipboard"
              />
              <Button
                label="フォーマット"
                icon="pi pi-align-left"
                size="small"
                severity="secondary"
                @click="toggleFormatted"
              />
            </div>
          </div>
        </template>
        <template #content>
          <div class="xml-container">
            <pre 
              ref="xmlContent"
              class="xml-content"
              :class="{ 'formatted': isFormatted }"
            >{{ displayXML }}</pre>
          </div>
        </template>
      </Card>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="閉じる"
          icon="pi pi-times"
          severity="secondary"
          @click="$emit('hide')"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { otaInvestigationService } from '@/services/otaInvestigationService';

// PrimeVue Components
import { Dialog, Card, Badge, Message, ProgressSpinner, Button } from 'primevue';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  xmlId: {
    type: [String, Number],
    default: null
  },
  serviceName: {
    type: String,
    default: ''
  }
});

// Emits
const emit = defineEmits(['hide', 'update:visible']);

// Reactive data
const loading = ref(false);
const error = ref(null);
const xmlData = ref(null);
const isFormatted = ref(true);
const xmlContent = ref(null);

// Computed properties
const dialogTitle = computed(() => {
  if (props.serviceName) {
    return `OTA XML データ - ${props.serviceName}`;
  }
  return 'OTA XML データ';
});

const displayXML = computed(() => {
  if (!xmlData.value?.xml_body) return '';
  
  if (isFormatted.value) {
    return formatXML(xmlData.value.xml_body);
  }
  return xmlData.value.xml_body;
});

// Watch for dialog visibility and xmlId changes
watch([() => props.visible, () => props.xmlId], ([visible, xmlId]) => {
  if (visible && xmlId) {
    fetchXMLData();
  }
});

// Methods
const fetchXMLData = async () => {
  if (!props.xmlId) return;
  
  loading.value = true;
  error.value = null;
  xmlData.value = null;
  
  try {
    xmlData.value = await otaInvestigationService.getOTAXMLData(props.xmlId);
  } catch (err) {
    console.error('Error fetching XML data:', err);
    error.value = err.message || 'XML データの取得に失敗しました';
  } finally {
    loading.value = false;
  }
};

const formatXML = (xml) => {
  try {
    // Simple XML formatting
    let formatted = xml;
    
    // Add line breaks after closing tags
    formatted = formatted.replace(/></g, '>\n<');
    
    // Add indentation
    const lines = formatted.split('\n');
    let indent = 0;
    const indentSize = 2;
    
    return lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      
      // Decrease indent for closing tags
      if (trimmed.startsWith('</')) {
        indent = Math.max(0, indent - indentSize);
      }
      
      const indentedLine = ' '.repeat(indent) + trimmed;
      
      // Increase indent for opening tags (but not self-closing or closing tags)
      if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.includes('<?')) {
        indent += indentSize;
      }
      
      return indentedLine;
    }).join('\n');
  } catch (err) {
    console.warn('XML formatting failed:', err);
    return xml;
  }
};

const toggleFormatted = () => {
  isFormatted.value = !isFormatted.value;
};

const copyXMLToClipboard = async () => {
  if (!xmlData.value?.xml_body) return;
  
  try {
    await navigator.clipboard.writeText(xmlData.value.xml_body);
    // You could add a toast notification here
    console.log('XML copied to clipboard');
  } catch (err) {
    console.error('Failed to copy XML:', err);
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = xmlData.value.xml_body;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const getStatusText = (status) => {
  const statusTexts = {
    'completed': '完了',
    'pending': '保留',
    'failed': '失敗',
    'processing': '処理中',
    'queued': 'キュー待ち'
  };
  return statusTexts[status] || status;
};

const getStatusSeverity = (status) => {
  const severities = {
    'completed': 'success',
    'pending': 'warn',
    'failed': 'danger',
    'processing': 'info',
    'queued': 'secondary'
  };
  return severities[status] || 'secondary';
};
</script>

<style scoped>
.ota-xml-dialog {
  font-family: 'Inter', sans-serif;
}

.xml-container {
  max-height: 500px;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background-color: #f9fafb;
}

.xml-content {
  margin: 0;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: transparent;
  color: #374151;
}

.xml-content.formatted {
  white-space: pre;
}

/* Syntax highlighting for XML */
.xml-content {
  color: #1f2937;
}

/* You could add more sophisticated XML syntax highlighting here */
</style>