import React, { useCallback } from 'react';
import { View } from 'react-native';
import { InterstitialAd, BannerAdSize, BannerAd, TestIds, AdEventType } from 'react-native-google-mobile-ads';
import {useSelector} from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BlurView from '../components/BlurView';
import {selectPremium} from '../redux/selectors';

const emptyObj = {};

/**
 * 
 * @param {boolean} options.premium Is premium or not
 * @param {string} options.unitId Interstitial ad unit id
 * @param {Function} options.onAdClose Callback when ad is closed
 * @param {Function} options.onAdShown Callback when ad is shown
 */
const showInterstitialAd = ({premium=false, unitId, onAdClose, onAdShown=(() => {})}) => {
  // const adUnitId = unitId;
  const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : unitId;
  const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  const showAd = () => {
    onAdShown();
    return interstitial.show();
  };
  const onClose = () => {
    onAdClose();
    // AdMobInterstitial.removeEventListener(null, onClose);
  };

  if (!premium) {
    interstitial.load();
    interstitial.addAdEventListener(AdEventType.LOADED, showAd);
    interstitial.addAdEventListener(AdEventType.CLOSED, onClose);
    interstitial.addAdEventListener(AdEventType.ERROR, (e) => {
      console.error(e)
      onClose();
    });
  } else {
    onClose();
  }
};

const useShowInterstitialAd = (options) => {
  const premium = useSelector(selectPremium);
  return useCallback(() => {
    showInterstitialAd({...options, premium});
  }, [premium]);
};

const AdBanner = ({ adUnitId, safeArea=true, style=emptyObj }) => {
  const premium = useSelector(selectPremium);
  const { bottom } = useSafeAreaInsets();
  if (premium) return <></>;

  const onAdFailedToLoad = (e) => console.error(e);

  return (
    <View style={[{position: 'relative', paddingBottom: safeArea ? bottom : 0 }, style]}>
      <BlurView
        blurType="materialDark"
        blurAmount={8}
        reducedTransparencyFallbackColor="#333" />
      <BannerAd 
        sizes={[BannerAdSize.ANCHORED_ADAPTIVE_BANNER]}
        unitId={__DEV__ ? TestIds.BANNER : adUnitId}
        // unitId={adUnitId}
        onAdFailedToLoad={onAdFailedToLoad} />
    </View>
  );
};

export {showInterstitialAd, AdBanner, useShowInterstitialAd};