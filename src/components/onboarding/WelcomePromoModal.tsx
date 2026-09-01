import WelcomePromotionModal from "./WelcomePromotionModal";

interface Props {
  open: boolean;
  onContinue: () => void;
  businessName?: string;
}

/**
 * WelcomePromoModal
 * Delegates to WelcomePromotionModal to ensure consistent Welcome Popup
 * styling and messaging across all onboarding and registration flows.
 */
const WelcomePromoModal = ({ open, onContinue }: Props) => {
  return <WelcomePromotionModal open={open} onContinue={onContinue} />;
};

export default WelcomePromoModal;
