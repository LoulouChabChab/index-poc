import { useState } from 'react'
import { SessionProvider } from './context/SessionContext'
import StepIngestion from './components/steps/StepIngestion'

const STEPS = ['ingestion', 'mapping', 'preview']

export default function App() {
  const [step, setStep] = useState('ingestion')

  return (
    <SessionProvider>
      {step === 'ingestion' && <StepIngestion onDone={() => setStep('mapping')} />}
      {step === 'mapping' && <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Étape mapping — à venir (Epic 3)</div>}
    </SessionProvider>
  )
}
