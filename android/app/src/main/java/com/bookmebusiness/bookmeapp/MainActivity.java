package com.bookmebusiness.bookmeapp;

import com.getcapacitor.BridgeActivity;

/**
 * Standard Capacitor BridgeActivity — no overrides.
 *
 * Intentionally NOT wired for https://bookmebusiness.com/* Universal/App Links: the
 * Business App must never open from a shared provider profile link (see
 * AndroidManifest.xml in this module — no autoVerify intent-filter for
 * bookmebusiness.com is declared there, matching this app's iOS side, which also has
 * no Associated Domains entitlement). Those links are exclusively the
 * Customer App's responsibility.
 */
public class MainActivity extends BridgeActivity {}
