import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { FigmaIcon } from '@/components/figma-icon'
import { FavoriteButton } from '@/features/account/favorite-button'
import { errorMessage } from '@/services/http'
import { useCartMutation } from './cart-hooks'
export function PurchaseButtons({
  nftId,
  editionId,
  quantity,
  disabled,
}: {
  nftId: string
  editionId: string
  quantity: number
  disabled: boolean
}) {
  const action = useCartMutation()
  const navigate = useNavigate()
  function add(checkout: boolean) {
    if (action.isPending || disabled) return
    action.mutate(
      { kind: 'add', line: { nftId, editionId, quantity } },
      {
        onSuccess: () => {
          if (checkout) void navigate({ to: '/cart' })
        },
      },
    )
  }
  return (
    <div className="purchase-button-area">
      <div className="purchase-buttons">
        <Button
          onClick={() => add(true)}
          disabled={disabled || action.isPending}
        >
          <span className="desktop-only">COMPRAR</span>
          <span className="mobile-only">Comprar NFT</span>
        </Button>
        <Button
          variant="outline"
          className="add-to-cart mobile-only"
          aria-label="Adicionar ao carrinho"
          disabled={disabled || action.isPending}
          onClick={() => add(false)}
        >
          <span className="mobile-only">
            <FigmaIcon name="md-imgShop" />
          </span>
        </Button>
        <span className="desktop-only">
          <FavoriteButton id={nftId} />
        </span>
      </div>
      <p role="status" className="purchase-feedback">
        {action.isPending
          ? 'Adicionando…'
          : action.isSuccess
            ? 'NFT adicionado ao carrinho.'
            : ''}
      </p>
      {action.isError && (
        <p role="alert" className="form-error">
          {errorMessage(action.error)}
        </p>
      )}
    </div>
  )
}
