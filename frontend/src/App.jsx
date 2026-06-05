import { useState } from 'react'
import { SessionProvider } from './context/SessionContext'
import StepIngestion from './components/steps/StepIngestion'
import StepMapping from './components/steps/StepMapping'
import StepPreview from './components/steps/StepPreview'

export default function App() {
  const [step, setStep] = useState('ingestion')

  return (
    <SessionProvider>
      {step === 'ingestion' && <StepIngestion onDone={() => setStep('mapping')} />}
      {step === 'mapping' && <StepMapping onDone={() => setStep('preview')} />}
      {step === 'preview' && <StepPreview onCorrect={() => setStep('mapping')} />}
    </SessionProvider>
  )
}
