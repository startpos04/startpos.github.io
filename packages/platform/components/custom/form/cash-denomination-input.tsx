/**
 * CashDenominationInput - Reusable cash denomination picker with bills and coins
 *
 * Provides an intuitive interface for entering cash amounts using Philippine peso
 * denominations (bills: 20, 50, 100, 200, 500, 1000; coins: 1, 5, 10, 20).
 * Includes a toggle to switch between denomination buttons and manual input.
 */

import { cn } from '@platform/lib/utils'
import { Calculator, Coins } from 'lucide-react'
import { useState } from 'react'

interface CashDenominationInputProps {
  /**
   * Current amount in cents (e.g., 10000 = ₱100.00)
   */
  value: number

  /**
   * Callback when amount changes (amount in cents)
   */
  onChange: (cents: number) => void

  /**
   * Callback when exact amount button is clicked
   * If provided, shows an "Exact" button
   */
  onExact?: () => void

  /**
   * Callback when clear button is clicked
   * If provided, shows a "Clear" button
   */
  onClear?: () => void

  /**
   * Whether the exact button should appear selected
   */
  isExactSelected?: boolean

  /**
   * Optional label above the denomination buttons
   */
  label?: string

  /**
   * Optional className for the container
   */
  className?: string

  /**
   * Whether to show the action buttons (Exact/Clear)
   */
  showActions?: boolean
}

const BILL_DENOMINATIONS = [20, 50, 100, 200, 500, 1000]
const COIN_DENOMINATIONS = [1, 5, 10, 20]

export function CashDenominationInput({
  value,
  onChange,
  onExact,
  onClear,
  isExactSelected = false,
  label,
  className,
  showActions = true,
}: CashDenominationInputProps) {
  const [inputMode, setInputMode] = useState<'denomination' | 'manual'>('denomination')

  const addDenomination = (pesos: number) => {
    onChange(value + pesos * 100)
  }

  const handleExact = () => {
    onExact?.()
  }

  const handleClear = () => {
    onChange(0)
    onClear?.()
  }

  const handleManualInput = (inputValue: string) => {
    const cents = Math.round(Number(inputValue) * 100)
    onChange(Number.isNaN(cents) ? 0 : cents)
  }

  return (
    <div className={cn('space-y-3', className)}>
      {label && <p className='text-sm font-medium text-foreground mb-2'>{label}</p>}

      {/* Toggle between denomination and manual input */}
      <div className='flex gap-1 p-1 bg-muted/50 rounded-lg'>
        <button
          type='button'
          onClick={() => setInputMode('denomination')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all',
            inputMode === 'denomination' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Coins className='w-3.5 h-3.5' />
          Denominations
        </button>
        <button
          type='button'
          onClick={() => setInputMode('manual')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all',
            inputMode === 'manual' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Calculator className='w-3.5 h-3.5' />
          Manual
        </button>
      </div>

      {/* Action buttons (Exact/Clear) - Always in the same position */}
      {showActions && (onExact || onClear) && (
        <div className='flex gap-1.5'>
          {onExact && (
            <button
              type='button'
              onClick={handleExact}
              className={cn(
                'flex-1 h-11 rounded-xl text-sm font-bold border transition-colors',
                isExactSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border/60 text-foreground hover:border-primary/50 hover:bg-primary/5',
              )}
            >
              Exact
            </button>
          )}
          {onClear && (
            <button
              type='button'
              onClick={handleClear}
              className='h-11 px-4 rounded-xl text-sm font-bold border border-border/60 bg-background text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition-colors'
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Content area - Fixed height to prevent shifting */}
      <div className='min-h-[240px]'>
        {inputMode === 'denomination' ? (
          <div className='space-y-3'>
            {/* Bills */}
            <div>
              <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5'>Bills</p>
              <div className='grid grid-cols-3 gap-1.5'>
                {BILL_DENOMINATIONS.map(bill => (
                  <button
                    key={`bill-${bill}`}
                    type='button'
                    onClick={() => addDenomination(bill)}
                    className='h-11 rounded-xl text-sm font-bold border border-border/60 bg-background text-foreground hover:border-primary/50 hover:bg-primary/5 active:scale-95 transition-all'
                  >
                    ₱{bill}
                  </button>
                ))}
              </div>
            </div>

            {/* Coins */}
            <div>
              <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5'>Coins</p>
              <div className='grid grid-cols-4 gap-1.5'>
                {COIN_DENOMINATIONS.map(coin => (
                  <button
                    key={`coin-${coin}`}
                    type='button'
                    onClick={() => addDenomination(coin)}
                    className='h-11 rounded-xl text-sm font-bold border border-border/60 bg-muted/40 text-foreground hover:border-primary/50 hover:bg-primary/5 active:scale-95 transition-all'
                  >
                    ₱{coin}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className='space-y-3'>
            {/* Manual Input */}
            <div>
              <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5'>Enter Amount</p>
              <div className='relative'>
                <span className='absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground select-none pointer-events-none'>₱</span>
                <input
                  type='number'
                  value={value / 100 || ''}
                  onChange={e => handleManualInput(e.target.value)}
                  placeholder='0.00'
                  step='0.01'
                  className='w-full h-16 pl-9 pr-4 text-2xl font-bold rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all'
                />
              </div>
            </div>

            {/* Quick add buttons */}
            <div>
              <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5'>Quick Add</p>
              <div className='grid grid-cols-4 gap-1.5 mb-3'>
                {[100, 500, 1000, 5000].map(amount => (
                  <button
                    key={`quick-${amount}`}
                    type='button'
                    onClick={() => addDenomination(amount)}
                    className='h-11 rounded-lg text-xs font-bold border border-border/60 bg-background text-foreground hover:border-primary/50 hover:bg-primary/5 active:scale-95 transition-all'
                  >
                    +₱{amount}
                  </button>
                ))}
              </div>
              <div className='grid grid-cols-3 gap-1.5'>
                {[10000, 20000, 50000].map(amount => (
                  <button
                    key={`quick-${amount}`}
                    type='button'
                    onClick={() => addDenomination(amount)}
                    className='h-11 rounded-lg text-xs font-bold border border-border/60 bg-muted/40 text-foreground hover:border-primary/50 hover:bg-primary/5 active:scale-95 transition-all'
                  >
                    +₱{amount.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
