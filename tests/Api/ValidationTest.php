<?php
declare(strict_types=1);

namespace Tests\Api;

class ValidationTest extends ApiTestCase
{
    public function testMissingContentType(): void
    {
        $response = $this->http->post("purchases/{$this->token}", [
            'headers' => ['Content-Type' => 'text/plain'],
            'body' => json_encode($this->validPurchaseBody()),
        ]);

        $this->assertSame(415, $response->getStatusCode());

        $body = json_decode($response->getBody()->getContents(), true);
        $this->assertSame('UNSUPPORTED_MEDIA_TYPE', $body['error']['code']);
    }

    public function testInvalidJsonBody(): void
    {
        $response = $this->http->post("purchases/{$this->token}", [
            'headers' => ['Content-Type' => 'application/json'],
            'body' => '{invalid json',
        ]);

        $this->assertSame(400, $response->getStatusCode());

        $body = json_decode($response->getBody()->getContents(), true);
        $this->assertSame('VALIDATION_ERROR', $body['error']['code']);
    }

    public function testEmptyItemsArray(): void
    {
        $response = $this->http->post("purchases/{$this->token}", [
            'json' => ['purchasedAt' => '2026-05-10', 'items' => []],
        ]);

        $this->assertSame(400, $response->getStatusCode());

        $body = json_decode($response->getBody()->getContents(), true);
        $this->assertSame('VALIDATION_ERROR', $body['error']['code']);
    }

    public function testMoreThan20Items(): void
    {
        $items = array_fill(0, 21, [
            'bagSizeGrams' => 500,
            'quantity' => 1,
            'priceCents' => 399,
            'priceUnit' => 'kg',
        ]);

        $response = $this->http->post("purchases/{$this->token}", [
            'json' => ['purchasedAt' => '2026-05-10', 'items' => $items],
        ]);

        $this->assertSame(400, $response->getStatusCode());

        $body = json_decode($response->getBody()->getContents(), true);
        $this->assertSame('VALIDATION_ERROR', $body['error']['code']);
    }

    public function testInvalidBagSizeGrams(): void
    {
        $body = $this->validPurchaseBody([
            'items' => [
                ['bagSizeGrams' => 100, 'quantity' => 1, 'priceCents' => 399, 'priceUnit' => 'kg'],
            ],
        ]);

        $response = $this->http->post("purchases/{$this->token}", ['json' => $body]);

        $this->assertSame(400, $response->getStatusCode());

        $decoded = json_decode($response->getBody()->getContents(), true);
        $this->assertSame('VALIDATION_ERROR', $decoded['error']['code']);
    }

    public function testInvalidQuantityZero(): void
    {
        $body = $this->validPurchaseBody([
            'items' => [
                ['bagSizeGrams' => 500, 'quantity' => 0, 'priceCents' => 399, 'priceUnit' => 'kg'],
            ],
        ]);

        $response = $this->http->post("purchases/{$this->token}", ['json' => $body]);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testInvalidQuantityTooHigh(): void
    {
        $body = $this->validPurchaseBody([
            'items' => [
                ['bagSizeGrams' => 500, 'quantity' => 100, 'priceCents' => 399, 'priceUnit' => 'kg'],
            ],
        ]);

        $response = $this->http->post("purchases/{$this->token}", ['json' => $body]);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testInvalidPriceCentsZero(): void
    {
        $body = $this->validPurchaseBody([
            'items' => [
                ['bagSizeGrams' => 500, 'quantity' => 1, 'priceCents' => 0, 'priceUnit' => 'kg'],
            ],
        ]);

        $response = $this->http->post("purchases/{$this->token}", ['json' => $body]);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testInvalidPriceCentsTooHigh(): void
    {
        $body = $this->validPurchaseBody([
            'items' => [
                ['bagSizeGrams' => 500, 'quantity' => 1, 'priceCents' => 100000, 'priceUnit' => 'kg'],
            ],
        ]);

        $response = $this->http->post("purchases/{$this->token}", ['json' => $body]);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testInvalidPriceUnit(): void
    {
        $body = $this->validPurchaseBody([
            'items' => [
                ['bagSizeGrams' => 500, 'quantity' => 1, 'priceCents' => 399, 'priceUnit' => 'lb'],
            ],
        ]);

        $response = $this->http->post("purchases/{$this->token}", ['json' => $body]);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testPurchasedAtOutsideSeasonRange(): void
    {
        $body = $this->validPurchaseBody(['purchasedAt' => '2026-01-01']);

        $response = $this->http->post("purchases/{$this->token}", ['json' => $body]);

        $this->assertSame(400, $response->getStatusCode());

        $decoded = json_decode($response->getBody()->getContents(), true);
        $this->assertSame('VALIDATION_ERROR', $decoded['error']['code']);
    }

    public function testPurchasedAtInvalidDate(): void
    {
        $body = $this->validPurchaseBody(['purchasedAt' => '2026-02-30']);

        $response = $this->http->post("purchases/{$this->token}", ['json' => $body]);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testOptionsPreflightReturns204WithCors(): void
    {
        $response = $this->http->options("purchases/{$this->token}");

        $this->assertSame(204, $response->getStatusCode());
        $this->assertTrue($response->hasHeader('Access-Control-Allow-Origin'));
        $this->assertTrue($response->hasHeader('Access-Control-Allow-Methods'));
    }

    public function testCorsOriginHeader(): void
    {
        $response = $this->http->get("group/{$this->token}");

        $this->assertSame('http://localhost:5173', $response->getHeaderLine('Access-Control-Allow-Origin'));
    }

    public function testSecurityHeadersPresent(): void
    {
        $response = $this->http->get("group/{$this->token}");

        $this->assertSame('nosniff', $response->getHeaderLine('X-Content-Type-Options'));
        $this->assertSame('no-referrer', $response->getHeaderLine('Referrer-Policy'));
        $this->assertSame('no-store', $response->getHeaderLine('Cache-Control'));
    }
}
