import { useState } from 'react'
import { SessionProvider } from './context/SessionContext'
import StepIngestion from './components/steps/StepIngestion'
import StepMapping from './components/steps/StepMapping'
import StepPreview from './components/steps/StepPreview'
import Stepper from './components/ui/Stepper'
import { updateHistoryStep } from './utils/history'
import { useSession } from './context/SessionContext'
// AppInner uses useSession — must be rendered inside SessionProvider

function AppInner({ onReset }) {
  const { sessionId } = useSession()
  const [step, setStep] = useState('ingestion')
  const [mappingExists, setMappingExists] = useState(false)

  function goTo(newStep) {
    if (sessionId) updateHistoryStep(sessionId, newStep)
    setStep(newStep)
  }

  return (
    <>
      <div style={headerStyles.bar}>
        <Stepper current={step} />
        {step !== 'ingestion' && (
          <button style={headerStyles.resetBtn} onClick={onReset} title="Recommencer depuis le début">
            ✕ Recommencer
          </button>
        )}
      </div>
      {step === 'ingestion' && (
        <StepIngestion
          onDone={() => { setMappingExists(false); goTo('mapping') }}
          onRestore={(restoredStep) => {
            setMappingExists(restoredStep === 'mapping' || restoredStep === 'preview')
            setStep(restoredStep)
          }}
        />
      )}
      {step === 'mapping' && (
        <StepMapping
          skipAnalysis={mappingExists}
          onDone={() => { setMappingExists(true); goTo('preview') }}
        />
      )}
      {step === 'preview' && <StepPreview onCorrect={() => goTo('mapping')} />}
    </>
  )
}

export default function App() {
  const [sessionKey, setSessionKey] = useState(0)

  return (
    <SessionProvider key={sessionKey}>
      <AppInner onReset={() => setSessionKey(k => k + 1)} />
    </SessionProvider>
  )
}

const headerStyles = {
  bar: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  resetBtn: {
    position: 'absolute', right: '1rem',
    background: 'none', border: '1px solid #e0e0e0', borderRadius: 6,
    padding: '0.3rem 0.75rem', fontSize: '0.82rem', color: '#888',
    cursor: 'pointer', fontFamily: 'sans-serif',
  },
}
