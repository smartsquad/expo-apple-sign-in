<script setup lang="ts">
import { computed, ref } from 'vue'

import { APPLE_MARK_PATH, APPLE_MARK_VIEW_BOX } from '../../../../src/apple-mark'

const EStyles = ['black', 'white', 'whiteOutline'] as const
const ETypes = ['signIn', 'continue', 'signUp'] as const
const ELabels = {
  signIn: 'Sign in with Apple',
  continue: 'Continue with Apple',
  signUp: 'Sign up with Apple',
} as const

type TStyle = (typeof EStyles)[number]
type TType = (typeof ETypes)[number]

const buttonStyle = ref<TStyle>('black')
const buttonType = ref<TType>('signIn')
const cornerRadius = ref(8)
const height = ref(48)
const pressed = ref(false)
const copied = ref(false)

const label = computed(() => ELabels[buttonType.value])
const markSize = computed(() => Math.round(height.value * 0.38))
const fontSize = computed(() => (height.value >= 52 ? 19 : 17))

const palette = computed(() => {
  if (buttonStyle.value === 'white') {
    return { background: '#ffffff', foreground: '#000000', borderWidth: 0 }
  }
  if (buttonStyle.value === 'whiteOutline') {
    return { background: '#ffffff', foreground: '#000000', borderWidth: 1 }
  }

  return { background: '#000000', foreground: '#ffffff', borderWidth: 0 }
})

const stageBackground = computed(() => (buttonStyle.value === 'black' ? '#ffffff' : '#000000'))

const snippet = computed(
  () =>
    `<AppleButton buttonStyle="${buttonStyle.value}" buttonType="${buttonType.value}" cornerRadius={${cornerRadius.value}} height={${height.value}} onSuccess={handleCredential} />`
)

async function copySnippet(): Promise<void> {
  await navigator.clipboard.writeText(snippet.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1600)
}
</script>

<template>
  <div class="apple-play">
    <div class="apple-play__stage" :style="{ backgroundColor: stageBackground }">
      <button
        type="button"
        class="apple-play__btn"
        :aria-label="label"
        :style="{
          height: `${height}px`,
          background: palette.background,
          color: palette.foreground,
          border: `${palette.borderWidth}px solid #000000`,
          borderRadius: `${cornerRadius}px`,
          opacity: pressed ? 0.86 : 1,
        }"
        @pointerdown="pressed = true"
        @pointerup="pressed = false"
        @pointerleave="pressed = false"
      >
        <svg
          :width="markSize"
          :height="markSize"
          :viewBox="APPLE_MARK_VIEW_BOX"
          aria-hidden="true"
          focusable="false"
        >
          <path :fill="palette.foreground" :d="APPLE_MARK_PATH" />
        </svg>
        <span class="apple-play__label" :style="{ fontSize: `${fontSize}px` }">{{ label }}</span>
      </button>
    </div>
    <div class="apple-play__controls">
      <fieldset class="apple-play__group">
        <legend>buttonStyle</legend>
        <label v-for="value in EStyles" :key="value" class="apple-play__option">
          <input v-model="buttonStyle" type="radio" name="apple-play-style" :value="value" />
          {{ value }}
        </label>
      </fieldset>
      <fieldset class="apple-play__group">
        <legend>buttonType</legend>
        <label v-for="value in ETypes" :key="value" class="apple-play__option">
          <input v-model="buttonType" type="radio" name="apple-play-type" :value="value" />
          {{ value }}
        </label>
      </fieldset>
      <label class="apple-play__slider">
        <span>cornerRadius: {{ cornerRadius }}</span>
        <input v-model.number="cornerRadius" type="range" min="0" max="24" step="1" />
      </label>
      <label class="apple-play__slider">
        <span>height: {{ height }}</span>
        <input v-model.number="height" type="range" min="40" max="64" step="1" />
      </label>
    </div>
    <div class="apple-play__code">
      <pre><code>{{ snippet }}</code></pre>
      <button type="button" class="apple-play__copy" @click="copySnippet">
        {{ copied ? 'Copied' : 'Copy' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.apple-play {
  margin: 24px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

.apple-play__stage {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.apple-play__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  max-width: 320px;
  min-width: 200px;
  padding: 0 16px;
  cursor: pointer;
  box-sizing: border-box;
  user-select: none;
}

.apple-play__label {
  font-weight: 600;
  letter-spacing: -0.2px;
  white-space: nowrap;
}

.apple-play__controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px 24px;
  padding: 20px 24px;
}

.apple-play__group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.apple-play__group legend {
  margin-bottom: 6px;
  padding: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
  font-weight: 600;
}

.apple-play__option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.apple-play__slider {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  font-weight: 600;
}

.apple-play__slider input,
.apple-play__option input {
  accent-color: var(--vp-c-text-1);
}

.apple-play__code {
  position: relative;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.apple-play__code pre {
  margin: 0;
  padding: 16px 84px 16px 24px;
  overflow-x: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.6;
}

.apple-play__copy {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  cursor: pointer;
}

.apple-play__copy:hover {
  background: var(--vp-c-bg-alt);
}
</style>
