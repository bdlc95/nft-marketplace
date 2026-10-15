import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { mockControlApi } from '@/services/mock-control'
import { http, errorMessage } from '@/services/http'
import { useIdentity } from '@/lib/session'
import type { Scenario } from '@/types/contracts'
export function DemoControls() {
  const cache = useQueryClient()
  const [open, setOpen] = useState(false)
  const { token } = useIdentity()
  const config = useQuery({
    queryKey: ['mock-config'],
    queryFn: mockControlApi.config,
    enabled: open,
  })
  const action = useMutation({
    mutationFn: async (command: string) => {
      if (command.startsWith('scenario:'))
        await mockControlApi.scenario(command.slice(9) as Scenario)
      else if (command === 'reset') {
        await mockControlApi.reset()
        window.location.reload()
        return
      } else if (command === 'price')
        await mockControlApi.updateNft({ price: '0.25' })
      else if (command === 'sold-out')
        await mockControlApi.updateNft({ available: 0 })
      else if (command === 'old' || command === 'duplicate')
        await mockControlApi.replay(command)
      else if (command === 'expire')
        await http.post('/__mock/session/expire', {})
      else if (command === 'fee') await http.post('/__mock/fee', {})
      else if (command === 'coupon')
        await http.post('/__mock/coupon/expire', {})
      else if (command === 'disconnect')
        await http.post('/__mock/socket/disconnect', {})
      else if (command === 'confirmed' || command === 'rejected') {
        await http.post('/__mock/orders/settle', { status: command })
        setOpen(false)
      } else if (command === 'order-old' || command === 'order-duplicate')
        await http.post('/__mock/orders/replay', {
          mode: command === 'order-old' ? 'old' : 'duplicate',
        })
      if (
        command !== 'old' &&
        command !== 'duplicate' &&
        command !== 'order-old' &&
        command !== 'order-duplicate' &&
        command !== 'disconnect'
      )
        await cache.invalidateQueries()
    },
  })
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Cenários de teste</Button>
      </DialogTrigger>
      <DialogContent className="filter-dialog">
        <DialogHeader>
          <DialogTitle>Laboratório de cenários</DialogTitle>
          <DialogDescription>
            Condições reproduzíveis para avaliar erros, pagamento e atualizações
            em tempo real.
          </DialogDescription>
        </DialogHeader>
        <label className="form-field">
          <span>Condição da rede</span>
          <select
            aria-label="Condição da rede"
            className="control"
            disabled={!config.data || action.isPending}
            value={config.data?.scenario || 'standard'}
            onChange={(event) =>
              action.mutate(`scenario:${event.target.value}`)
            }
          >
            {(
              [
                ['standard', 'Padrão'],
                ['slow', 'Lento (2,5 segundos)'],
                ['variable', 'Latência variável'],
                ['empty', 'Resultado vazio'],
                ['http-error', 'Erro HTTP 503'],
                ['network-error', 'Falha de conexão'],
                ['favorite-error', 'Falha ao salvar favoritos'],
                ['payment-rejected', 'Pagamento recusado'],
                ['order-timeout', 'Timeout após criar pedido'],
                ['order-pending', 'Pedido fica pendente'],
                ['wallet-refused', 'Carteira recusa conexão'],
                ['validation-error', 'Erro de validação do perfil'],
              ] as [Scenario, string][]
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <p className="muted-note">
          Eventos de NFT afetam Emerald Ape #042, edição 1/50. Use KURIO10 para
          10% de desconto e EXPIRADO para testar cupom vencido.
        </p>
        <div className="demo-actions">
          {[
            ['price', 'Alterar preço para 0,25 ETH'],
            ['sold-out', 'Esgotar edição'],
            ['old', 'Enviar evento antigo'],
            ['duplicate', 'Enviar evento duplicado'],
            ['fee', 'Alterar taxa de rede'],
            ['coupon', 'Expirar cupom KURIO10'],
            ['disconnect', 'Interromper conexão'],
          ].map(([command, label]) => (
            <Button
              key={command}
              variant="outline"
              disabled={action.isPending}
              onClick={() => action.mutate(command)}
            >
              {label}
            </Button>
          ))}
        </div>
        <h3>Sessão e pedidos</h3>
        <div className="demo-actions">
          {[
            ['expire', 'Expirar sessão'],
            ['confirmed', 'Confirmar pedido pendente'],
            ['rejected', 'Recusar pedido pendente'],
            ['order-old', 'Enviar pedido antigo'],
            ['order-duplicate', 'Enviar pedido duplicado'],
          ].map(([command, label]) => (
            <Button
              key={command}
              variant="outline"
              disabled={action.isPending || !token}
              onClick={() => action.mutate(command)}
            >
              {label}
            </Button>
          ))}
        </div>
        <p role="status" aria-live="polite" className="min-h-6 text-sm">
          {action.isPending
            ? 'Aplicando…'
            : action.isSuccess
              ? 'Cenário aplicado.'
              : ''}
        </p>
        {(action.isError || config.isError) && (
          <p role="alert" className="form-error">
            {errorMessage(action.error || config.error)}
          </p>
        )}
        <Button
          disabled={action.isPending}
          onClick={() => action.mutate('reset')}
        >
          Restaurar cenário inicial
        </Button>
      </DialogContent>
    </Dialog>
  )
}
